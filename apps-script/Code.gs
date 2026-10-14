/**
 * itket-analytics 수집기 (Google Apps Script)
 *
 * GA4 → 월별 JSON 을 만들어 드라이브 파일에 저장하고, 웹앱 주소(doGet)로 내려준다.
 * 1시간마다 자동 실행(setupTrigger). 서비스 계정·JSON 키 불필요 — 이 스크립트를 만든 구글 계정의 GA4 권한으로 읽는다.
 *
 * 사용법: apps-script/README 대신 저장소 README 의 "처음 한 번만" 참고.
 */
const CFG = {
  PROPERTY_ID: '여기에_GA4_속성_ID_숫자',   // GA4 관리 → 속성 설정 → 속성 ID
  START_MONTH: '2025-01',
  SIGNUP_EVENT: 'sign_up',
  TOP_ROWS: 50,
  FILE_NAME: 'itket-analytics-data.json',
  BUDGET_MS: 4.5 * 60 * 1000,                // 한 번 실행에 쓸 최대 시간(6분 제한 대비)
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
  const t = total[0] || {};
  const pick = (r) => { const o = {}; M.forEach((k) => (o[k] = r[k] || 0)); return o; };
  return {
    month: m,
    partial: m === today.slice(0, 7),
    updated: new Date().toISOString(),
    total: pick(t),
    daily: daily.map((r) => Object.assign({ date: ymd_(r.date) }, pick(r))),
    pages: pages, sources: sources, channels: channels,
    campaigns: campaigns.filter((r) => r.sessionCampaignName && r.sessionCampaignName !== '(not set)' && r.sessionCampaignName !== '(direct)'),
    devices: devices,
    signups: signups.map((r) => ({ date: ymd_(r.date), count: r.eventCount })),
  };
}

function file_() {
  const it = DriveApp.getFilesByName(CFG.FILE_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFile(CFG.FILE_NAME, '{"months":{}}', MimeType.PLAIN_TEXT);
}
function load_() { try { return JSON.parse(file_().getBlob().getDataAsString()); } catch (e) { return { months: {} }; } }
function save_(store) { file_().setContent(JSON.stringify(store)); }

/** 1시간마다 실행: 당월·전월은 항상 새로, 빠진 과거 월은 시간 되는 만큼 채운다. */
function collectAll() {
  if (/[^0-9]/.test(CFG.PROPERTY_ID)) throw new Error('CFG.PROPERTY_ID 에 GA4 속성 ID(숫자)를 넣어 주세요.');
  const started = Date.now();
  const today = todayKst_(), cur = today.slice(0, 7), prev = addMonth_(cur, -1);
  const store = load_();
  const all = [];
  for (let m = CFG.START_MONTH; m <= cur; m = addMonth_(m, 1)) all.push(m);
  const queue = [cur, prev].filter((m) => all.indexOf(m) >= 0).concat(all.filter((m) => m !== cur && m !== prev && !store.months[m]));
  const errors = [];
  for (const m of queue) {
    if (Date.now() - started > CFG.BUDGET_MS) break;      // 남은 달은 다음 실행에서 이어서
    try { store.months[m] = collectMonth_(m, today); store.updated = new Date().toISOString(); save_(store); }
    catch (e) { errors.push(m + ': ' + e.message); }
  }
  store.errors = errors;
  if (!errors.length) store.updated = new Date().toISOString();
  save_(store);
  if (errors.length) throw new Error(errors.join('\n'));   // 실행 기록에 실패로 남김
}

/** 웹앱 주소로 저장된 JSON 을 내려준다. */
function doGet() {
  return ContentService.createTextOutput(file_().getBlob().getDataAsString()).setMimeType(ContentService.MimeType.JSON);
}

/** 한 번만 실행: 1시간마다 collectAll 을 돌리는 트리거를 만든다. */
function setupTrigger() {
  ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === 'collectAll').forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('collectAll').timeBased().everyHours(1).create();
}
