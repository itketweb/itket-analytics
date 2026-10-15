// GA4 → data/ga4/YYYY-MM.json  (매 실행마다 당월·전월은 항상 새로 받고, 없는 과거 월은 채운다)
// 환경변수: GA4_PROPERTY_ID(숫자), GA4_SERVICE_ACCOUNT(서비스 계정 JSON). GA4_MOCK=1 이면 가짜 데이터(테스트용).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getToken, runReport, rows } from './ga4.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'ga4.json'), 'utf8'));
const OUT = path.join(DATA, 'ga4');
fs.mkdirSync(OUT, { recursive: true });

const kst = () => new Date(Date.now() + 9 * 3600e3);
const ymd = (d) => d.toISOString().slice(0, 10);
const today = ymd(kst());
const curMonth = today.slice(0, 7);
const lastDay = (m) => { const [y, mo] = m.split('-').map(Number); return ymd(new Date(Date.UTC(y, mo, 0))); };
const addMonth = (m, n) => { const [y, mo] = m.split('-').map(Number); const d = new Date(Date.UTC(y, mo - 1 + n, 1)); return d.toISOString().slice(0, 7); };
const months = [];
for (let m = cfg.startMonth; m <= curMonth; m = addMonth(m, 1)) months.push(m);
const refresh = new Set([curMonth, addMonth(curMonth, -1)]);
const todo = months.filter((m) => refresh.has(m) || !fs.existsSync(path.join(OUT, `${m}.json`)));
console.log(`수집 대상 ${todo.length}개월: ${todo.join(', ')}`);

const M = ['activeUsers', 'newUsers', 'sessions', 'screenPageViews', 'userEngagementDuration', 'engagedSessions'];
const N = cfg.topRows || 50;

async function collectReal(m, ctx) {
  const dateRanges = [{ startDate: `${m}-01`, endDate: m === curMonth ? today : lastDay(m) }];
  const q = (dimensions, metrics, extra = {}) => runReport(ctx.token, ctx.property, { dateRanges, dimensions: dimensions.map((name) => ({ name })), metrics: metrics.map((name) => ({ name })), limit: 1000, ...extra }).then(rows);
  const top = (metric) => ({ orderBys: [{ metric: { metricName: metric }, desc: true }], limit: N });
  const [total, daily, pages, sources, channels, campaigns, devices, signups] = await Promise.all([
    q([], M),
    q(['date'], M, { orderBys: [{ dimension: { dimensionName: 'date' } }] }),
    q(['pagePath'], ['screenPageViews', 'activeUsers', 'userEngagementDuration'], top('screenPageViews')),
    q(['sessionSourceMedium'], ['sessions', 'activeUsers', 'newUsers', 'engagedSessions'], top('sessions')),
    q(['sessionDefaultChannelGroup'], ['sessions', 'activeUsers'], top('sessions')),
    q(['sessionCampaignName', 'sessionSourceMedium'], ['sessions', 'activeUsers'], top('sessions')),
    q(['deviceCategory'], ['activeUsers', 'sessions'], top('sessions')),
    q(['date'], ['eventCount'], { dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: cfg.signupEvent } } } }),
  ]);
  const t = total[0] || {};
  return {
    total: Object.fromEntries(M.map((k) => [k, t[k] || 0])),
    daily: daily.map((r) => ({ date: `${r.date.slice(0, 4)}-${r.date.slice(4, 6)}-${r.date.slice(6)}`, ...Object.fromEntries(M.map((k) => [k, r[k]])) })),
    pages, sources, channels,
    campaigns: campaigns.filter((r) => r.sessionCampaignName && r.sessionCampaignName !== '(not set)' && r.sessionCampaignName !== '(direct)'),
    devices,
    signups: signups.map((r) => ({ date: `${r.date.slice(0, 4)}-${r.date.slice(4, 6)}-${r.date.slice(6)}`, count: r.eventCount })),
  };
}

function collectMock(m) {
  let s = [...m].reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
  const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const end = m === curMonth ? Number(today.slice(8)) : Number(lastDay(m).slice(8));
  const daily = Array.from({ length: end }, (_, i) => {
    const u = Math.round(260 + rnd() * 160), sess = Math.round(u * 1.3), pv = Math.round(sess * (2 + rnd() * 2));
    return { date: `${m}-${String(i + 1).padStart(2, '0')}`, activeUsers: u, newUsers: Math.round(u * 0.6), sessions: sess, screenPageViews: pv, userEngagementDuration: sess * Math.round(40 + rnd() * 50), engagedSessions: Math.round(sess * 0.7) };
  });
  const sum = (k) => daily.reduce((a, r) => a + r[k], 0);
  const total = Object.fromEntries(M.map((k) => [k, k === 'activeUsers' ? Math.round(sum(k) * 0.8) : sum(k)]));
  const paths = ['/', '/goods/goods_view.php', '/dbk/dbk_estimate_list.php', '/goods/goods_list.php', '/board/list.php', '/member/join.php'];
  const pages = paths.map((p, i) => ({ pagePath: p, screenPageViews: Math.round(total.screenPageViews / (i + 2.2)), activeUsers: Math.round(total.activeUsers / (i + 2.6)), userEngagementDuration: Math.round(total.userEngagementDuration / (i + 5)) }));
  const src = ['google / organic', 'naver / organic', '(direct) / (none)', 'naver / cpc', 'kakao / referral'];
  const sources = src.map((x, i) => ({ sessionSourceMedium: x, sessions: Math.round(total.sessions / (i + 1.8)), activeUsers: Math.round(total.activeUsers / (i + 2)), newUsers: Math.round(total.newUsers / (i + 2.4)), engagedSessions: Math.round(total.engagedSessions / (i + 2)) }));
  return {
    total, daily, pages, sources,
    channels: [['Organic Search', 2], ['Direct', 3.4], ['Paid Search', 6], ['Referral', 9]].map(([n, d]) => ({ sessionDefaultChannelGroup: n, sessions: Math.round(total.sessions / d), activeUsers: Math.round(total.activeUsers / d) })),
    campaigns: [{ sessionCampaignName: 'brand_search', sessionSourceMedium: 'naver / cpc', sessions: Math.round(total.sessions / 7), activeUsers: Math.round(total.activeUsers / 8) }],
    devices: [['desktop', 1.6], ['mobile', 2.2], ['tablet', 14]].map(([n, d]) => ({ deviceCategory: n, activeUsers: Math.round(total.activeUsers / d), sessions: Math.round(total.sessions / d) })),
    signups: daily.filter((_, i) => i % 3 === 0).map((r) => ({ date: r.date, count: 1 + Math.round(rnd() * 3) })),
    conv: (() => {
      const defs = [{ id: 'estimate', name: '견적 요청 완료', path: '/dbk/dbk_estimate_complete.php' }, { id: 'signup', name: '회원가입 완료', path: '/member/join_ok.php' }, { id: 'order', name: '주문 완료', path: '/order/order_end.php' }];
      const out = { defs, total: {}, daily: {}, byMedium: {}, byChannel: {}, byCampaign: {}, byLanding: {}, byGoods: {} };
      defs.forEach((d, di) => {
        const f = [0.012, 0.006, 0.003][di];
        out.total[d.id] = { sessions: Math.round(total.sessions * f), users: Math.round(total.sessions * f * 0.9) };
        out.daily[d.id] = daily.map((r) => ({ date: r.date, count: Math.round(r.sessions * f) }));
        const mk = (names) => names.map((k, i) => ({ k, s: Math.round(out.total[d.id].sessions / (i + 1.7)), n: Math.round(total.sessions / (i + 1.4)) }));
        out.byMedium[d.id] = mk(src); out.byChannel[d.id] = mk(['Organic Search', 'Direct', 'Paid Search']);
        out.byCampaign[d.id] = mk(['brand_search | naver / cpc', 'GDN_test | google / cpc']);
        out.byLanding[d.id] = mk(['/', '/huawei/huawei_intro.php', '/dbk/dbk_estimate_form.php']);
        out.byGoods[d.id] = mk(['11166', '11003', '11012']);
      });
      return out;
    })(),
    events: [['page_view', 1], ['session_start', 0.7], ['scroll', 0.4], ['click', 0.2]].map(([eventName, r]) => ({ eventName, eventCount: Math.round(total.screenPageViews * r), totalUsers: Math.round(total.activeUsers * r), keyEvents: 0 })),
    keyBySource: [], ecom: [],
    goods: [['11166', 'Huawei FusionCube 1000'], ['11003', 'HP 255R G10'], ['11012', 'HP ZGX Nano G1n']].map(([id, title], i) => ({ id, title, views: Math.round(total.screenPageViews / (i + 30)) })),
    categories: [['038006003', 'HUAWEI 스토리지'], ['021001', 'HPE ProLiant 서버']].map(([id, title], i) => ({ id, title, views: Math.round(total.screenPageViews / (i + 12)) })),
    boards: [['Constructioncase', '구축사례'], ['docuread', '자료실']].map(([id, title], i) => ({ id, title, views: Math.round(total.screenPageViews / (i + 40)) })),
  };
}

// 가장 간단한 경로: Apps Script 웹앱(apps-script/Code.gs)이 만들어 둔 JSON 을 받아 월별 파일로 저장한다.
if (process.env.GA4_WEBAPP_URL) {
  const res = await fetch(process.env.GA4_WEBAPP_URL.trim(), { redirect: 'follow' });
  const text = await res.text();
  let store;
  try { store = JSON.parse(text); } catch { console.error(`웹앱 응답이 JSON 이 아닙니다 (HTTP ${res.status}). 웹앱 배포의 접근 권한이 "모든 사용자"인지 확인하세요.`); process.exit(1); }
  const got = Object.keys(store.months || {}).sort();
  if (!got.length) { console.error('웹앱에 아직 수집된 월이 없습니다. Apps Script 에서 collectAll 을 실행하세요.'); process.exit(1); }
  for (const m of got) fs.writeFileSync(path.join(OUT, `${m}.json`), JSON.stringify(store.months[m]));
  fs.writeFileSync(path.join(OUT, '_meta.json'), JSON.stringify({ updated: store.updated || new Date().toISOString(), failed: (store.errors || []).length }));
  console.log(`웹앱에서 ${got.length}개월 받음 (수집기 갱신 ${store.updated || '알 수 없음'})`);
  if ((store.errors || []).length) { console.error('수집기 오류:', store.errors.join(' / ')); process.exit(1); }
  process.exit(0);
}

let ctx = null, failed = 0;
if (process.env.GA4_MOCK !== '1') {
  const property = (process.env.GA4_PROPERTY_ID || '').trim();
  const keyText = process.env.GA4_SERVICE_ACCOUNT;
  if (!property || !keyText) { console.error('GA4_PROPERTY_ID / GA4_SERVICE_ACCOUNT 가 설정되지 않았습니다 (README 의 "처음 한 번만" 참고).'); process.exit(2); }
  ctx = { property, token: await getToken(JSON.parse(keyText)) };
}
for (const m of todo) {
  try {
    const body = process.env.GA4_MOCK === '1' ? collectMock(m) : await collectReal(m, ctx);
    fs.writeFileSync(path.join(OUT, `${m}.json`), JSON.stringify({ month: m, partial: m === curMonth, updated: new Date().toISOString(), ...body }));
    console.log(`  ${m} 완료`);
  } catch (e) { failed++; console.error(`  ${m} 실패: ${e.message}`); }
}
fs.writeFileSync(path.join(OUT, '_meta.json'), JSON.stringify({ updated: new Date().toISOString(), failed }));
process.exit(failed ? 1 : 0);
