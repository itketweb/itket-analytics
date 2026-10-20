import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const GA4_DIR = path.join(ROOT, 'data/ga4');
const NAMES_FILE = path.join(ROOT, 'data/names.json');
const SIGNUPS_FILE = path.join(ROOT, 'data/ref/godomall-signups.json');

console.log('================================================================');
console.log('🔍 [itket-analytics] 전체 데이터 정밀 감사 및 무결성 분석 시작');
console.log('================================================================\n');

// 1. 월별 데이터 파일 점검
const files = fs.readdirSync(GA4_DIR).filter(f => /^\d{4}-\d{2}\.json$/.test(f)).sort();
console.log(`📁 1. data/ga4/*.json 점검 (총 ${files.length}개 파일)`);

const auditResults = [];

for (const f of files) {
  const mKey = f.slice(0, 7);
  const raw = fs.readFileSync(path.join(GA4_DIR, f), 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    auditResults.push({ month: mKey, status: 'ERROR', error: 'JSON Parse Error' });
    continue;
  }

  const [y, mo] = mKey.split('-').map(Number);
  const daysInMonth = new Date(y, mo, 0).getDate();

  const total = data.total || {};
  const daily = data.daily || [];
  const pages = data.pages || [];
  const sources = data.sources || [];
  const channels = data.channels || [];
  const campaigns = data.campaigns || [];
  const devices = data.devices || [];
  const signups = data.signups || [];
  const conv = data.conv || {};
  const goods = data.goods || [];

  const totalSignups = signups.reduce((sum, s) => sum + (s.count || 0), 0);

  // 일자 누락 검사
  const dailyDates = new Set(daily.map(d => d.date));
  let missingDays = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const dStr = `${mKey}-${String(day).padStart(2, '0')}`;
    if (!dailyDates.has(dStr)) missingDays++;
  }

  auditResults.push({
    month: mKey,
    fileSizeKB: (raw.length / 1024).toFixed(1),
    sourceType: data.sourceType || 'ga4_standard',
    v: data.v,
    users: total.activeUsers || 0,
    sessions: total.sessions || 0,
    views: total.screenPageViews || 0,
    dailyCount: daily.length,
    missingDays,
    pagesCount: pages.length,
    sourcesCount: sources.length,
    channelsCount: channels.length,
    campaignsCount: campaigns.length,
    devicesCount: devices.length,
    signupsCount: totalSignups,
    hasConv: Boolean(conv.total),
    goodsCount: goods.length,
  });
}

console.table(auditResults.map(r => ({
  '월': r.month,
  '크기': `${r.fileSizeKB}KB`,
  '방문자': r.users,
  '세션': r.sessions,
  'PV': r.views,
  '일수(누락)': `${r.dailyCount}(${r.missingDays})`,
  '페이지': r.pagesCount,
  '유입원': r.sourcesCount,
  '가입': r.signupsCount,
  '출처구분': r.sourceType,
})));

// 2. names.json 점검
console.log('\n🏷️ 2. names.json (상품/카테고리/게시판 명칭 매핑) 점검');
if (fs.existsSync(NAMES_FILE)) {
  const names = JSON.parse(fs.readFileSync(NAMES_FILE, 'utf8'));
  console.log(`- 상품명 캐시: ${Object.keys(names.goods || {}).length}개`);
  console.log(`- 카테고리 캐시: ${Object.keys(names.categories || {}).length}개`);
  console.log(`- 게시판 캐시: ${Object.keys(names.boards || {}).length}개`);
} else {
  console.log('⚠️ names.json 파일이 존재하지 않습니다.');
}

// 3. godomall-signups.json 점검
console.log('\n📋 3. data/ref/godomall-signups.json 점검');
if (fs.existsSync(SIGNUPS_FILE)) {
  const godoSignups = JSON.parse(fs.readFileSync(SIGNUPS_FILE, 'utf8'));
  console.log(`- 기준일자: ${godoSignups.asOf}`);
  console.log(`- 출처: ${godoSignups.source}`);
  console.log(`- 월별 등록 건수:`, godoSignups.monthly);
} else {
  console.log('⚠️ godomall-signups.json 파일이 존재하지 않습니다.');
}

// 4. 소스코드 내 목업/하드코딩 키워드 전수 검사
console.log('\n🔎 4. 소스 코드(src/) 내 Mock/Fake/하드코딩 데이터 검사');
const srcDir = path.join(ROOT, 'src');
function scanDir(dir, pattern) {
  let hits = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      hits = hits.concat(scanDir(full, pattern));
    } else if (/\.(ts|tsx|js|jsx)$/.test(ent.name)) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      lines.forEach((l, idx) => {
        if (pattern.test(l)) {
          hits.push({ file: path.relative(ROOT, full), line: idx + 1, text: l.trim() });
        }
      });
    }
  }
  return hits;
}

const mockHits = scanDir(srcDir, /(mock|fake|dummy|sampleData|mockData)/i);
if (mockHits.length === 0) {
  console.log('✅ src/ 소스코드 내에 mock, fake, dummy, sampleData 등 가짜 데이터 변수나 로직이 전혀 없습니다.');
} else {
  console.log(`⚠️ 발견된 목업 관련 키워드 (${mockHits.length}건):`);
  mockHits.forEach(h => console.log(`  [${h.file}:${h.line}] ${h.text}`));
}

// 5. scripts/ 내 목업 검사
const scriptHits = scanDir(path.join(ROOT, 'scripts'), /(GA4_MOCK|mockData|sampleData)/i);
console.log(`\n🔎 5. scripts/ 내 목업 검사: ${scriptHits.length}건 발견`);
scriptHits.forEach(h => console.log(`  [${h.file}:${h.line}] ${h.text}`));

console.log('\n================================================================');
console.log('✅ 데이터 정밀 감사 완료');
console.log('================================================================');
