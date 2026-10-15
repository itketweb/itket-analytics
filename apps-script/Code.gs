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
  JOIN_DONE_PATH: '/member/join_ok.php',     // 회원가입 완료 화면 — 사이트가 sign_up 이벤트를 보내지 않을 때의 대체 기준
  TOP_ROWS: 50,
  FILE_NAME: 'itket-analytics-data.json',
  BUDGET_MS: 4.5 * 60 * 1000,                // 한 번 실행에 쓸 최대 시간(6분 제한 대비)
  SCHEMA: 3,                                 // 수집 항목이 바뀌면 올린다 → 과거 월을 다시 채움 (3: 전환·이벤트·랜딩 추가)
  MEASUREMENT_ID: 'G-EJ5SHHZPND',            // 참고용(데이터 스트림 식별). 수집에는 PROPERTY_ID 를 쓴다
  // 전환 정의: 이 화면(경로)을 본 세션을 "전환"으로 센다. 사이트가 전환 이벤트를 보내지 않아 화면 기준으로 센다.
  // 바꾸려면 여기만 고치고 SCHEMA 숫자를 올린다. path 는 정확히 일치해야 한다.
  CONVERSIONS: [
    { id: 'estimate', name: '견적 요청 완료', path: '/dbk/dbk_estimate_complete.php' },
    { id: 'signup', name: '회원가입 완료', path: '/member/join_ok.php' },
    { id: 'order', name: '주문 완료', path: '/order/order_end.php' },
  ],
  PAGE_MAX_PER_10MIN: 40,                    // 페이지 분석(?mode=page) 새 조회 한도 — 남용·한도 소진 방지
  PAGE_CACHE_SEC: 600,                       // 페이지 분석 결과 캐시(당월). 지난 달은 1시간
  LIVE_CACHE_SEC: 30,                        // ① 접속자 수 갱신 간격(실측 34토큰/회) — 남은 한도가 충분할 때
  LIVE_COOLDOWN_SEC: 300,                    // 한도 오류 직후 API 재호출을 쉬는 시간
  LIVE_MID_SEC: 180,                         // ② 지금 보는 페이지 + 분당 그래프(2회 약 70토큰) 기본 간격
  LIVE_SLOW_SEC: 600,                        // ③ 기기 구분(1회) 기본 간격
  LIVE_BUDGET: [[9000, 30], [6500, 60], [4000, 120], [2000, 300]],   // [남은 시간당 토큰이 이 값 초과, ①의 간격(초)] — ②③은 ①의 6배·20배 이상으로 함께 늘어남
  LIVE_BUDGET_MIN_TTL: 900,                  // 남은 토큰이 2,500 이하일 때
  SHOP_REFRESH_MIN: 120,                     // 인기 상품·카테고리·게시판(무거운 조회)은 이 간격으로만 새로 계산
};
let LAST_QUOTA_ = null;                      // 마지막 API 응답의 한도 사용량(진단용)
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
    returnPropertyQuota: true,
  }, extra || {});
  const resp = AnalyticsData.Properties.runReport(req, 'properties/' + CFG.PROPERTY_ID);
  if (resp.propertyQuota) LAST_QUOTA_ = resp.propertyQuota;
  return rows_(resp);
}

/** 고도몰 URL 규칙으로 상품(goodsNo)·카테고리(cateCd)·게시판(bdId) 조회수를 집계한다. */
function shopStats_(range) {
  const contains = (v) => ({ filter: { fieldName: 'pagePath', stringFilter: { matchType: 'CONTAINS', value: v } } });
  const rows = q_(['pagePathPlusQueryString', 'pageTitle'], ['screenPageViews', 'activeUsers'], range, {
    dimensionFilter: { orGroup: { expressions: [contains('goods_view'), contains('goods_list'), contains('board/')] } },
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 5000,
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

/** 회원가입 수(일별). GA4 에 sign_up 이벤트가 있으면 그것을, 없으면 가입 완료 화면(join_ok)을 본 사용자 수를 쓴다.
 *  (이 사이트는 가입 완료 시 sign_up 이벤트를 보내지 않아 2025년부터 이벤트가 0건 — 2026-10-14 확인) */
function signupsOf_(range) {
  const ev = q_(['date'], ['eventCount'], range, {
    dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: CFG.SIGNUP_EVENT } } },
  });
  if (ev.reduce((a, r) => a + r.eventCount, 0) > 0) return { source: 'event', rows: ev.map((r) => ({ date: ymd_(r.date), count: r.eventCount })) };
  const pv = q_(['date'], ['activeUsers'], range, {
    dimensionFilter: { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'EXACT', value: CFG.JOIN_DONE_PATH } } },
  });
  return { source: 'join_ok', rows: pv.map((r) => ({ date: ymd_(r.date), count: r.activeUsers })) };
}

/** 선택 항목: 실패해도 월 수집 전체를 막지 않는다(한도 오류는 그대로 올려 다음에 재시도). */
function opt_(fn, fallback) {
  try { return fn(); }
  catch (e) { if (/Exhausted|quota/i.test(String((e && e.message) || e))) throw e; return fallback; }
}
const convPaths_ = () => CFG.CONVERSIONS.map((d) => d.path);
const convFilter_ = () => ({ filter: { fieldName: 'pagePath', inListFilter: { values: convPaths_() } } });
const convIdOf_ = (path) => { const d = CFG.CONVERSIONS.filter((x) => x.path === path)[0]; return d && d.id; };
const bySessions_ = { orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 2000 };
/** 랜딩 URL → 묶음 키. 상품 상세는 상품번호로, 나머지는 경로로 묶는다. */
function landKey_(u) {
  u = String(u);
  const g = /[?&]goodsNo=(\d+)/.exec(u);
  if (g && u.indexOf('goods_view') >= 0) return 'goods:' + g[1];
  return u.split('?')[0];
}

/** 전환(정의된 화면을 본 세션) 집계: 전체·일별·유입 매체·채널·캠페인·랜딩 페이지·상품. n = 같은 키의 전체 세션(전환율 계산용). */
function convStats_(range) {
  const out = { defs: CFG.CONVERSIONS.map((d) => ({ id: d.id, name: d.name, path: d.path })), total: {}, daily: {}, byMedium: {}, byChannel: {}, byCampaign: {}, byLanding: {}, byGoods: {} };
  const ids = CFG.CONVERSIONS.map((d) => d.id);
  ids.forEach((id) => { out.total[id] = { sessions: 0, users: 0 }; out.daily[id] = []; ['byMedium', 'byChannel', 'byCampaign', 'byLanding', 'byGoods'].forEach((b) => (out[b][id] = [])); });
  const cf = convFilter_();
  q_(['pagePath'], ['sessions', 'activeUsers'], range, { dimensionFilter: cf }).forEach((r) => {
    const id = convIdOf_(r.pagePath); if (id) out.total[id] = { sessions: r.sessions, users: r.activeUsers };
  });
  q_(['date', 'pagePath'], ['sessions'], range, { dimensionFilter: cf, orderBys: [{ dimension: { dimensionName: 'date' } }] }).forEach((r) => {
    const id = convIdOf_(r.pagePath); if (id) out.daily[id].push({ date: ymd_(r.date), count: r.sessions });
  });
  const by = (bucket, dims) => {
    const key = (r) => dims.map((d) => r[d]).join(' | ');
    const base = {};
    q_(dims, ['sessions'], range, bySessions_).forEach((r) => (base[key(r)] = r.sessions));
    const acc = {};
    q_(['pagePath'].concat(dims), ['sessions'], range, Object.assign({ dimensionFilter: cf }, bySessions_)).forEach((r) => {
      const id = convIdOf_(r.pagePath); if (!id) return;
      (acc[id] = acc[id] || []).push({ k: key(r), s: r.sessions, n: base[key(r)] || 0 });
    });
    ids.forEach((id) => (out[bucket][id] = (acc[id] || []).slice(0, 30)));
  };
  by('byMedium', ['sessionSourceMedium']);
  by('byChannel', ['sessionDefaultChannelGroup']);
  by('byCampaign', ['sessionCampaignName', 'sessionSourceMedium']);
  // 랜딩(첫 진입) 페이지 기준: 어느 페이지로 들어온 방문이 전환했는가. 상품 상세는 상품번호로 묶는다.
  const baseL = {};
  q_(['landingPagePlusQueryString'], ['sessions'], range, { orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 5000 }).forEach((r) => {
    const k = landKey_(r.landingPagePlusQueryString); baseL[k] = (baseL[k] || 0) + r.sessions;
  });
  const accL = {};
  q_(['pagePath', 'landingPagePlusQueryString'], ['sessions'], range, { dimensionFilter: cf, orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 5000 }).forEach((r) => {
    const id = convIdOf_(r.pagePath); if (!id) return;
    const k = landKey_(r.landingPagePlusQueryString), m = (accL[id] = accL[id] || {});
    m[k] = (m[k] || 0) + r.sessions;
  });
  ids.forEach((id) => {
    const rows = Object.keys(accL[id] || {}).map((k) => ({ k: k, s: accL[id][k], n: baseL[k] || 0 })).sort((a, b) => b.s - a.s);
    out.byGoods[id] = rows.filter((r) => r.k.indexOf('goods:') === 0).slice(0, 50).map((r) => ({ k: r.k.slice(6), s: r.s, n: r.n }));
    out.byLanding[id] = rows.filter((r) => r.k.indexOf('goods:') !== 0).slice(0, 30);
  });
  return out;
}

/** GA4 이커머스 이벤트(상품 노출·장바구니·구매)가 오는 경우만 값이 있다. */
function ecomStats_(range) {
  const rows = q_(['itemName'], ['itemsViewed', 'itemsAddedToCart', 'itemsPurchased', 'itemRevenue'], range, { orderBys: [{ metric: { metricName: 'itemsViewed' }, desc: true }], limit: 50 });
  return rows.filter((r) => r.itemName && r.itemName !== '(not set)').map((r) => ({ name: r.itemName, viewed: r.itemsViewed, cart: r.itemsAddedToCart, bought: r.itemsPurchased, revenue: r.itemRevenue }));
}

function collectMonth_(m, today, reuse) {
  const range = { startDate: m + '-01', endDate: m === today.slice(0, 7) ? today : lastDay_(m) };
  const top = (metric) => ({ orderBys: [{ metric: { metricName: metric }, desc: true }], limit: CFG.TOP_ROWS });
  const total = q_([], M, range);
  const daily = q_(['date'], M, range, { orderBys: [{ dimension: { dimensionName: 'date' } }] });
  const pages = q_(['pagePath'], ['screenPageViews', 'activeUsers', 'userEngagementDuration'], range, top('screenPageViews'));
  const sources = q_(['sessionSourceMedium'], ['sessions', 'activeUsers', 'newUsers', 'engagedSessions'], range, top('sessions'));
  const channels = q_(['sessionDefaultChannelGroup'], ['sessions', 'activeUsers'], range, top('sessions'));
  const campaigns = q_(['sessionCampaignName', 'sessionSourceMedium'], ['sessions', 'activeUsers'], range, top('sessions'));
  const devices = q_(['deviceCategory'], ['activeUsers', 'sessions'], range, top('sessions'));
  const sg = signupsOf_(range);
  // 무거운 조회: 재사용 가능한 최근 값이 있으면 다시 계산하지 않는다
  const fresh = reuse && reuse.goods && reuse.shopUpdated && (Date.now() - Date.parse(reuse.shopUpdated) < CFG.SHOP_REFRESH_MIN * 60000);
  const shop = fresh ? { goods: reuse.goods, categories: reuse.categories, boards: reuse.boards } : shopStats_(range);
  const conv = opt_(() => convStats_(range), null);
  const events = opt_(() => {
    const ord = { orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }], limit: 40 };
    try { return q_(['eventName'], ['eventCount', 'totalUsers', 'keyEvents'], range, ord); }
    catch (e) { if (/Exhausted|quota/i.test(String(e && e.message || e))) throw e; return q_(['eventName'], ['eventCount', 'totalUsers'], range, ord); }
  }, []);
  const keyBySource = opt_(() => q_(['sessionSourceMedium'], ['sessions', 'keyEvents'], range, { orderBys: [{ metric: { metricName: 'keyEvents' }, desc: true }], limit: 30 }), []);
  const ecom = opt_(() => ecomStats_(range), []);
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
    signups: sg.rows, signupSource: sg.source,   // 'event' = GA4 sign_up 이벤트, 'join_ok' = 가입 완료 화면(일별 방문자) 기준
    conv: conv,                                   // 전환(정의된 화면 기준) — null 이면 이번 수집에서 실패
    events: events, keyBySource: keyBySource.filter((r) => r.keyEvents > 0), ecom: ecom,   // GA4 이벤트 현황 / GA4 주요 이벤트 기준 전환 / 이커머스 상품 지표
    goods: shop.goods, categories: shop.categories, boards: shop.boards,
    shopUpdated: fresh ? reuse.shopUpdated : new Date().toISOString(),
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
    try { store.months[cur] = collectMonth_(cur, today, store.months[cur]); }
    catch (e) { if (/Exhausted|quota/i.test(String((e && e.message) || e))) return; throw e; }   // 시간당 한도 소진은 조용히 건너뜀(다음 15분에 재시도)
    store.updated = new Date().toISOString();
    store.quota = LAST_QUOTA_ && { at: new Date().toISOString(), q: LAST_QUOTA_ };
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

/** 한 번만 실행: 이미 저장된 과거 월의 회원가입 수를 새 기준(signupsOf_)으로 채운다. 호출 제한을 피하려고 월마다 잠깐 쉰다. */
function backfillSignups() {
  checkProperty_();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;
  try {
    const started = Date.now();
    const today = todayKst_();
    const store = load_();
    const keys = Object.keys(store.months).sort();
    let done = 0;
    for (const m of keys) {
      if (Date.now() - started > CFG.BUDGET_MS) break;
      const x = store.months[m];
      if (x.signupSource) continue;                       // 이미 새 기준
      if (x.total && x.total.sessions < 100) { x.signupSource = 'none'; continue; }   // 방문이 거의 없던 달은 건너뜀
      const range = { startDate: m + '-01', endDate: m === today.slice(0, 7) ? today : lastDay_(m) };
      const sg = signupsOf_(range);
      x.signups = sg.rows; x.signupSource = sg.source; done++;
      Utilities.sleep(1500);
    }
    save_(store);
    Logger.log('보정한 달: ' + done + ' / 전체 ' + keys.length + (Date.now() - started > CFG.BUDGET_MS ? ' (시간 초과 — 다시 실행하면 이어서 진행)' : ''));
  } finally { lock.releaseLock(); }
}

/** 실시간(최근 30분) — GA4 Realtime API, 3단 갱신 (호출 1건 ≈ 34~55토큰, 시간당 한도 14,000)
 *  ① 접속자 수 1회: 30초 — 화면에서 가장 중요한 숫자
 *  ② 지금 보는 페이지 + 분당 그래프 2회: 3분
 *  ③ 기기 구분 1회: 10분
 *  남은 토큰이 줄면 ①②③ 간격을 함께 늘리고, 한도 오류가 나면 5분 쉬면서 마지막 성공 값을 stale 로 돌려준다. */
function liveNow_() {
  const cache = CacheService.getScriptCache();
  if (cache.get('liveCool')) return staleLive_('조회 한도 회복 대기 중');
  const part = (k) => { const v = cache.get(k); return v ? JSON.parse(v) : null; };
  let fast = part('liveFast'), mid = part('liveMid'), slow = part('liveSlow');
  const assemble = (budget) => ({
    at: fast.at,
    activeUsers: fast.activeUsers,
    pages: mid.pages, minutes: mid.minutes, devices: slow.devices,
    partsAt: { mid: mid.at, slow: slow.at },
    budget: budget,
  });
  const remPrev = part('liveRem');
  if (fast && mid && slow) return assemble({ cost: 0, remaining: remPrev && remPrev.v, ttl: null, fresh: {} });   // 전부 캐시 — GA4 호출 없음
  try {
    let cost = 0, remaining = remPrev ? remPrev.v : null;
    const call = (dims, metrics, extra) => {
      const resp = AnalyticsData.Properties.runRealtimeReport(Object.assign({
        dimensions: dims.map((name) => ({ name })),
        metrics: metrics.map((name) => ({ name })),
        limit: 20,
        returnPropertyQuota: true,
      }, extra || {}), 'properties/' + CFG.PROPERTY_ID);
      const q = resp.propertyQuota && (resp.propertyQuota.tokensPerProjectPerHour || resp.propertyQuota.tokensPerHour);
      if (q) { cost += q.consumed || 0; remaining = q.remaining; }
      return resp;
    };
    const now = () => new Date().toISOString();
    const fresh = {};
    if (!fast) { const t = rows_(call([], ['activeUsers']))[0] || { activeUsers: 0 }; fast = { at: now(), activeUsers: t.activeUsers || 0 }; fresh.fast = true; }
    if (!mid) {
      mid = {
        at: now(),
        pages: rows_(call(['unifiedScreenName'], ['activeUsers', 'screenPageViews'], { orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }], limit: 8 })),
        minutes: rows_(call(['minutesAgo'], ['activeUsers'], { orderBys: [{ dimension: { dimensionName: 'minutesAgo' } }], limit: 31 })),
      };
      fresh.mid = true;
    }
    if (!slow) { slow = { at: now(), devices: rows_(call(['deviceCategory'], ['activeUsers'])) }; fresh.slow = true; }
    const ttl = liveTtl_(remaining);
    if (fresh.fast) cache.put('liveFast', JSON.stringify(fast), ttl);
    if (fresh.mid) cache.put('liveMid', JSON.stringify(mid), Math.min(21600, Math.max(CFG.LIVE_MID_SEC, ttl * 6)));
    if (fresh.slow) cache.put('liveSlow', JSON.stringify(slow), Math.min(21600, Math.max(CFG.LIVE_SLOW_SEC, ttl * 20)));
    if (remaining != null) cache.put('liveRem', JSON.stringify({ v: remaining }), 3600);
    const out = assemble({ cost: cost, remaining: remaining, ttl: ttl, fresh: fresh });   // 이번 요청에 쓴 토큰 / 남은 토큰 / ①의 간격(초) / 새로 받은 단계
    cache.put('liveLast', JSON.stringify(out), 21600);
    return out;
  } catch (e) {
    cache.put('liveCool', '1', CFG.LIVE_COOLDOWN_SEC);
    return staleLive_(String((e && e.message) || e));
  }
}
function liveTtl_(remaining) {
  if (remaining == null) return CFG.LIVE_CACHE_SEC;
  for (let i = 0; i < CFG.LIVE_BUDGET.length; i++) if (remaining > CFG.LIVE_BUDGET[i][0]) return CFG.LIVE_BUDGET[i][1];
  return CFG.LIVE_BUDGET_MIN_TTL;
}
function staleLive_(why) {
  const last = CacheService.getScriptCache().get('liveLast');
  if (!last) return { error: why };
  const o = JSON.parse(last);
  o.stale = true;
  o.staleReason = String(why).slice(0, 160);
  return o;
}

/** 특정 페이지 통계(?mode=page&q=경로/키워드&month=YYYY-MM). q 가 들어 있는 모든 URL(쿼리 포함)을 합쳐 본다.
 *  예) /dbk/dbk_estimate_form.php · goodsNo=11166 · /huawei/ — 결과는 캐시하고, 새 조회는 10분에 PAGE_MAX_PER_10MIN 회까지만 허용한다. */
function pageStats_(q, month) {
  q = String(q || '').replace(/[\u0000-\u001f]/g, '').trim();
  if (q.length < 2 || q.length > 120) return { error: '검색어는 2~120자로 입력해 주세요.' };
  const today = todayKst_(), cur = today.slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month || '') || month < CFG.START_MONTH || month > cur) month = cur;
  const cache = CacheService.getScriptCache();
  const hex = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, q.toLowerCase()).map((b) => ('0' + (b & 255).toString(16)).slice(-2)).join('');
  const ck = 'pg:' + month + ':' + hex;
  const hit = cache.get(ck);
  if (hit) return JSON.parse(hit);
  const used = Number(cache.get('pgRate') || 0);
  if (used >= CFG.PAGE_MAX_PER_10MIN) return { error: '조회가 몰려 잠시 쉬는 중입니다. 몇 분 뒤 다시 시도해 주세요.' };
  cache.put('pgRate', String(used + 1), 600);
  const range = { startDate: month + '-01', endDate: month === cur ? today : lastDay_(month) };
  const F = { filter: { fieldName: 'pagePathPlusQueryString', stringFilter: { matchType: 'CONTAINS', value: q, caseSensitive: false } } };
  const L = { andGroup: { expressions: [{ filter: { fieldName: 'landingPagePlusQueryString', stringFilter: { matchType: 'CONTAINS', value: q, caseSensitive: false } } }, convFilter_()] } };
  const LF = { filter: { fieldName: 'landingPagePlusQueryString', stringFilter: { matchType: 'CONTAINS', value: q, caseSensitive: false } } };
  const top = (metric, n) => ({ dimensionFilter: F, orderBys: [{ metric: { metricName: metric }, desc: true }], limit: n });
  try {
    const out = { q: q, month: month, at: new Date().toISOString(), partial: month === cur, errors: [] };
    const part = (name, fn, fb) => { try { return fn(); } catch (e) { const msg = String((e && e.message) || e); if (/Exhausted|quota/i.test(msg)) throw e; out.errors.push(name + ': ' + msg.slice(0, 90)); return fb; } };
    out.total = part('total', () => q_([], ['screenPageViews', 'activeUsers', 'sessions', 'userEngagementDuration'], range, { dimensionFilter: F })[0] || {}, {});
    out.daily = part('daily', () => q_(['date'], ['screenPageViews', 'activeUsers'], range, { dimensionFilter: F, orderBys: [{ dimension: { dimensionName: 'date' } }] }).map((r) => ({ date: ymd_(r.date), screenPageViews: r.screenPageViews, activeUsers: r.activeUsers })), []);
    out.monthly = part('monthly', () => q_(['yearMonth'], ['screenPageViews', 'activeUsers'], { startDate: CFG.START_MONTH + '-01', endDate: today }, { dimensionFilter: F, orderBys: [{ dimension: { dimensionName: 'yearMonth' } }] }).map((r) => ({ month: r.yearMonth.slice(0, 4) + '-' + r.yearMonth.slice(4), screenPageViews: r.screenPageViews, activeUsers: r.activeUsers })), []);
    out.sources = part('sources', () => q_(['sessionSourceMedium'], ['sessions', 'screenPageViews'], range, top('sessions', 10)), []);
    out.devices = part('devices', () => q_(['deviceCategory'], ['activeUsers', 'screenPageViews'], range, top('screenPageViews', 5)), []);
    out.urls = part('urls', () => q_(['pagePathPlusQueryString'], ['screenPageViews', 'activeUsers'], range, top('screenPageViews', 15)), []);
    out.events = part('events', () => q_(['eventName'], ['eventCount'], range, top('eventCount', 10)), []);
    // 이 페이지로 처음 들어온 방문(랜딩) 중 전환한 비율
    out.entry = { sessions: 0, conv: {}, byMedium: {} };
    part('entry', () => {
      out.entry.sessions = (q_([], ['sessions'], range, { dimensionFilter: LF })[0] || {}).sessions || 0;
      q_(['pagePath'], ['sessions'], range, { dimensionFilter: L }).forEach((r) => { const id = convIdOf_(r.pagePath); if (id) out.entry.conv[id] = r.sessions; });
      q_(['pagePath', 'sessionSourceMedium'], ['sessions'], range, Object.assign({ dimensionFilter: L }, bySessions_)).forEach((r) => {
        const id = convIdOf_(r.pagePath); if (!id) return;
        const a = (out.entry.byMedium[id] = out.entry.byMedium[id] || []); if (a.length < 8) a.push({ k: r.sessionSourceMedium, s: r.sessions });
      });
    }, null);
    out.defs = CFG.CONVERSIONS.map((d) => ({ id: d.id, name: d.name }));
    cache.put(ck, JSON.stringify(out), month === cur ? CFG.PAGE_CACHE_SEC : 3600);
    return out;
  } catch (e) {
    return { error: String((e && e.message) || e).slice(0, 200) };
  }
}

/** 웹앱: ?mode=live | ?mode=cur | ?mode=page&q=..&month=.. | (기본) 전체. */
function doGet(e) {
  const mode = e && e.parameter && e.parameter.mode;
  let body;
  try {
    if (mode === 'live') body = liveNow_();
    else if (mode === 'page') body = pageStats_(e.parameter.q, e.parameter.month);
    else if (mode === 'cur') {
      const store = load_(), cur = todayKst_().slice(0, 7), prev = addMonth_(cur, -1);
      const months = {};
      [cur, prev].forEach((m) => { if (store.months[m]) months[m] = store.months[m]; });
      body = { updated: store.updated, months: months, quota: store.quota || null };
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

/**
 * 진단용(에디터에서 직접 실행): GA4 데이터 필터(Internal Traffic)가 "테스트" 상태일 때 직원 접속이 얼마나 걸리는지 로그에 찍는다.
 * 활성화하기 전에 걸리는 양이 합리적인지 확인하는 용도. 읽기 전용이며 웹앱 배포에는 영향이 없다.
 */
function checkInternalFilter() {
  const today = todayKst_();
  const range = { startDate: addMonth_(today.slice(0, 7), -1) + '-01', endDate: today };
  const out = ['== 테스트 데이터 필터 확인 (' + range.startDate + ' ~ ' + range.endDate + ')'];
  ['testDataFilterName', 'testDataFilterId'].forEach((dim) => {
    try {
      const rows = q_([dim], ['eventCount', 'activeUsers', 'sessions', 'screenPageViews'], range, { orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }], limit: 10 });
      out.push('-- ' + dim);
      rows.forEach((r) => out.push('   ' + r[dim] + ' | 이벤트 ' + r.eventCount + ' | 방문자 ' + r.activeUsers + ' | 세션 ' + r.sessions + ' | 조회 ' + r.screenPageViews));
    } catch (e) { out.push('-- ' + dim + ' 조회 실패: ' + String((e && e.message) || e).slice(0, 120)); }
  });
  Logger.log(out.join('\n'));
}
