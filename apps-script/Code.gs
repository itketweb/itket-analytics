/**
 * itket-analytics 수집기 v2 (Google Apps Script)
 *
 * GA4 → 월별 JSON(드라이브 파일) + 실시간 현황을 웹앱 주소(doGet)로 내려준다.
 *  - collectRecent : 15분마다, 당월만 새로 수집 (대시보드가 2분마다 가져감)
 *  - collectAll    : 3시간마다, 당월·전월 갱신 + 빠진/구버전 과거 월 채움
 *  - ?mode=live    : GA4 Realtime API (지금 접속자·지금 보는 페이지), 20초 캐시
 *  - ?mode=cur     : 당월 + 전월 JSON (가벼움)
 *  - (기본)        : 전체 월 JSON
 * 서비스 계정·JSON 키 불필요 — 이 스크립트를 만든 구글 계정의 GA4 권한으로 읽는다.
 * 처음 설정은 저장소 README 의 "처음 한 번만" 참고. 코드를 고치면 "배포 관리 → 새 버전"으로 다시 배포.
 */
const CFG = {
  PROPERTY_ID: '257396991',   // GA4 관리 → 속성 설정 → 속성 ID
  START_MONTH: '2025-01',
  SIGNUP_EVENT: 'sign_up',
  TOP_ROWS: 50,
  FILE_NAME: 'itket-analytics-data.json',
  BUDGET_MS: 4.5 * 60 * 1000,                // 한 번 실행에 쓸 최대 시간(6분 제한 대비)
  SCHEMA: 2,                                 // 수집 항목이 바뀌면 올린다 → 과거 월을 다시 채움
  LIVE_CACHE_SEC: 20,
};
const M = ['activeUsers', 'newUsers', 'sessions', 'screenPageViews', 'userEngagementDuration', 'engagedSessions'];

function todayKst_() { return Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd'); }
function lastDay_(m) { const [y, mo] = m.split('-').map(Number); return Utilities.formatDate(new Date(Date.UTC(y, mo, 0)), 'UTC', 'yyyy-MM-dd'); }
function addMonth_(m, n) { const [y, mo] = m.split('-').map(Number); return Utilities.formatDate(new Date(Date.UTC(y, mo - 1 + n, 1)), 'UTC', 'yyyy-MM'); }
function ymd_(s) { return s.slice(0, 4) + '-' + s.slice(4, 6) + '-' + s.slice(6); }

function rows_(resp) {
  const dh = (resp.dimensionHeaders || []).map((h) => h.name);
  const mh = (resp.metricHeaders || []).map((h) => h.name);
  return (resp.rows || []).map((r) => {
    const o = {};
    dh.forEach((n, i) => (o[n] = r.dimensionValues[i].value));
    mh.forEach((n, i) => (o[n] = Number(r.metricValues[i].value)));
    return o;
  });
}
function q_(dims, metrics, range, extra) {
  const req = Object.assign({
    dateRanges: [range],
    dimensions: dims.map((name) => ({ name })),
    metrics: metrics.map((name) => ({ name })),
    limit: 1000,
  }, extra || {});
  return rows_(AnalyticsData.Properties.runReport(req, 'properties/' + CFG.PROPERTY_ID));
}

/** 고도몰 URL 규칙으로 상품(goodsNo)·카테고리(cateCd)·게시판(bdId) 조회수를 집계한다. */
function shopStats_(range) {
  const contains = (v) => ({ filter: { fieldName: 'pagePath', stringFilter: { matchType: 'CONTAINS', value: v } } });
  const rows = q_(['pagePathPlusQueryString', 'pageTitle'], ['screenPageViews', 'activeUsers'], range, {
    dimensionFilter: { orGroup: { expressions: [contains('goods_view'), contains('goods_list'), contains('board/')] } },
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 10000,
  });
  const acc = { goods: {}, categories: {}, boards: {} };
  const add = (bucket, id, r) => {
    const o = bucket[id] || (bucket[id] = { id: id, title: r.pageTitle, views: 0 });
    o.views += r.screenPageViews;
    if (!o.title || o.title === '(not set)') o.title = r.pageTitle;
  };
  rows.forEach((r) => {
    const u = r.pagePathPlusQueryString;
    let m;
    if (u.indexOf('goods_view') >= 0 && (m = u.match(/[?&]goodsNo=(\d+)/))) add(acc.goods, m[1], r);
    else if (u.indexOf('goods_list') >= 0 && (m = u.match(/[?&]cateCd=([0-9A-Za-z]+)/))) add(acc.categories, m[1], r);
    else if (u.indexOf('board/') >= 0 && (m = u.match(/[?&]bdId=([0-9A-Za-z_]+)/))) add(acc.boards, m[1], r);
  });
  const top = (b, n) => Object.keys(b).map((k) => b[k]).sort((a, c) => c.views - a.views).slice(0, n);
  return { goods: top(acc.goods, 100), categories: top(acc.categories, 100), boards: top(acc.boards, 30) };
}

function collectMonth_(m, today) {
  const range = { startDate: m + '-01', endDate: m === today.slice(0, 7) ? today : lastDay_(m) };
  const top = (metric) => ({ orderBys: [{ metric: { metricName: metric }, desc: true }], limit: CFG.TOP_ROWS });
  const total = q_([], M, range);
  const daily = q_(['date'], M, range, { orderBys: [{ dimension: { dimensionName: 'date' } }] });
  const pages = q_(['pagePath'], ['screenPageViews', 'activeUsers', 'userEngagementDuration'], range, top('screenPageViews'));
  const sources = q_(['sessionSourceMedium'], ['sessions', 'activeUsers', 'newUsers', 'engagedSessions'], range, top('sessions'));
  const channels = q_(['sessionDefaultChannelGroup'], ['sessions', 'activeUsers'], range, top('sessions'));
  const campaigns = q_(['sessionCampaignName', 'sessionSourceMedium'], ['sessions', 'activeUsers'], range, top('sessions'));
  const devices = q_(['deviceCategory'], ['activeUsers', 'sessions'], range, top('sessions'));
  const signups = q_(['date'], ['eventCount'], range, {
    dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: CFG.SIGNUP_EVENT } } },
  });
  const shop = shopStats_(range);
  const t = total[0] || {};
  const pick = (r) => { const o = {}; M.forEach((k) => (o[k] = r[k] || 0)); return o; };
  return {
    v: CFG.SCHEMA,
    month: m,
    partial: m === today.slice(0, 7),
    updated: new Date().toISOString(),
    total: pick(t),
    daily: daily.map((r) => Object.assign({ date: ymd_(r.date) }, pick(r))),
    pages: pages, sources: sources, channels: channels,
    campaigns: campaigns.filter((r) => r.sessionCampaignName && r.sessionCampaignName !== '(not set)' && r.sessionCampaignName !== '(direct)'),
    devices: devices,
    signups: signups.map((r) => ({ date: ymd_(r.date), count: r.eventCount })),
    goods: shop.goods, categories: shop.categories, boards: shop.boards,
  };
}

function file_() {
  const it = DriveApp.getFilesByName(CFG.FILE_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFile(CFG.FILE_NAME, '{"months":{}}', MimeType.PLAIN_TEXT);
}
function load_() { try { return JSON.parse(file_().getBlob().getDataAsString()); } catch (e) { return { months: {} }; } }
function save_(store) { file_().setContent(JSON.stringify(store)); }

function checkProperty_() {
  if (/[^0-9]/.test(CFG.PROPERTY_ID)) throw new Error('CFG.PROPERTY_ID 에 GA4 속성 ID(숫자)를 넣어 주세요.');
}

/** 15분마다: 당월만 새로 수집(빠름). */
function collectRecent() {
  checkProperty_();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;                       // 다른 수집이 돌고 있으면 건너뜀
  try {
    const today = todayKst_(), cur = today.slice(0, 7);
    const store = load_();
    store.months[cur] = collectMonth_(cur, today);
    store.updated = new Date().toISOString();
    save_(store);
  } finally { lock.releaseLock(); }
}

/** 3시간마다: 당월·전월은 항상 새로, 빠진/구버전 과거 월은 시간 되는 만큼 채운다. */
function collectAll() {
  checkProperty_();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;
  try {
    const started = Date.now();
    const today = todayKst_(), cur = today.slice(0, 7), prev = addMonth_(cur, -1);
    const store = load_();
    const all = [];
    for (let m = CFG.START_MONTH; m <= cur; m = addMonth_(m, 1)) all.push(m);
    const stale = (m) => !store.months[m] || store.months[m].v !== CFG.SCHEMA;
    const queue = [cur, prev].filter((m) => all.indexOf(m) >= 0).concat(all.filter((m) => m !== cur && m !== prev && stale(m)));
    const errors = [];
    for (const m of queue) {
      if (Date.now() - started > CFG.BUDGET_MS) break;    // 남은 달은 다음 실행에서 이어서
      try { store.months[m] = collectMonth_(m, today); store.updated = new Date().toISOString(); save_(store); }
      catch (e) { errors.push(m + ': ' + e.message); }
    }
    store.errors = errors;
    if (!errors.length) store.updated = new Date().toISOString();
    save_(store);
    if (errors.length) throw new Error(errors.join('\n'));   // 실행 기록에 실패로 남김
  } finally { lock.releaseLock(); }
}

/** 실시간(최근 30분) — GA4 Realtime API. */
function liveNow_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('live');
  if (hit) return JSON.parse(hit);
  const run = (dims, metrics, extra) => rows_(AnalyticsData.Properties.runRealtimeReport(Object.assign({
    dimensions: dims.map((name) => ({ name })),
    metrics: metrics.map((name) => ({ name })),
    limit: 20,
  }, extra || {}), 'properties/' + CFG.PROPERTY_ID));
  const total = run([], ['activeUsers'])[0] || { activeUsers: 0 };
  const out = {
    at: new Date().toISOString(),
    activeUsers: total.activeUsers || 0,
    pages: run(['unifiedScreenName'], ['activeUsers', 'screenPageViews'], { orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }], limit: 8 }),
    devices: run(['deviceCategory'], ['activeUsers']),
    minutes: run(['minutesAgo'], ['activeUsers'], { orderBys: [{ dimension: { dimensionName: 'minutesAgo' } }], limit: 31 }),
  };
  cache.put('live', JSON.stringify(out), CFG.LIVE_CACHE_SEC);
  return out;
}

/** 웹앱: ?mode=live | ?mode=cur | (기본) 전체. */
function doGet(e) {
  const mode = e && e.parameter && e.parameter.mode;
  let body;
  try {
    if (mode === 'live') body = liveNow_();
    else if (mode === 'cur') {
      const store = load_(), cur = todayKst_().slice(0, 7), prev = addMonth_(cur, -1);
      const months = {};
      [cur, prev].forEach((m) => { if (store.months[m]) months[m] = store.months[m]; });
      body = { updated: store.updated, months: months };
    } else body = load_();
  } catch (err) { body = { error: String(err && err.message || err) }; }
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}

/** 한 번만 실행: 자동 실행 트리거(15분 / 3시간)를 만든다. 다시 실행해도 중복되지 않는다. */
function setupTrigger() {
  ScriptApp.getProjectTriggers().filter((t) => ['collectAll', 'collectRecent'].indexOf(t.getHandlerFunction()) >= 0).forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('collectRecent').timeBased().everyMinutes(15).create();
  ScriptApp.newTrigger('collectAll').timeBased().everyHours(3).create();
}

/**
 * 진단용(에디터에서 직접 실행): 특정 페이지의 조회수가 어디서 오는지 출처·국가·기기·날짜별로 로그에 찍는다.
 * 고도몰 통계와 GA4 수치가 크게 다를 때 원인 파악에 쓴다. DIAG 만 바꿔 실행.
 */
function diagnose() {
  const DIAG = { path: '/dbk/dbk_estimate_list.php', month: '2026-09' };
  const range = { startDate: DIAG.month + '-01', endDate: lastDay_(DIAG.month) };
  const filter = { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'EXACT', value: DIAG.path } } };
  const out = ['== ' + DIAG.path + ' (' + DIAG.month + ')'];
  [['sessionSourceMedium', '출처/매체'], ['country', '국가'], ['deviceCategory', '기기'], ['date', '날짜'], ['browser', '브라우저'], ['pagePathPlusQueryString', 'URL(쿼리 포함)']].forEach((d) => {
    const rows = q_([d[0]], ['screenPageViews', 'activeUsers', 'sessions'], range, {
      dimensionFilter: filter, orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 6,
    });
    out.push('-- ' + d[1]);
    rows.forEach((r) => out.push('   ' + String(r[d[0]]).slice(0, 70) + ' | PV ' + r.screenPageViews + ' | 방문자 ' + r.activeUsers + ' | 세션 ' + r.sessions));
  });
  Logger.log(out.join('\n'));
}
