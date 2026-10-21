import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const OUT_FILE = path.join(ROOT, 'data', 'ref', 'godomall-quotes.json');

// 1. 소스 데이터 로드 (로컬 its-ad-insight/data/latest.json 우선, 없을 시 GAS fetch)
const LOCAL_SOURCE = path.resolve(ROOT, '..', 'its-ad-insight', 'data', 'latest.json');
const GAS_URL =
  'https://script.google.com/macros/s/AKfycbzQS9yMlp9L_eRaH77QWLsY6GOY7L5hyRk1fkuaAHg8GvJmHHwhPRgr2zWldgbX5-cNcg/exec?key=2d3b0cc2b04a4873a835583968ca7a0b';

async function fetchSourceData() {
  if (fs.existsSync(LOCAL_SOURCE)) {
    console.log(`로컬 스냅샷 사용: ${LOCAL_SOURCE}`);
    return JSON.parse(fs.readFileSync(LOCAL_SOURCE, 'utf8'));
  }
  console.log(`GAS 엔드포인트에서 실시간 데이터 로드: ${GAS_URL}`);
  const res = await fetch(GAS_URL);
  if (!res.ok) throw new Error(`GAS HTTP 에러: ${res.status}`);
  return await res.json();
}

async function main() {
  const data = await fetchSourceData();
  const rawList = data.quotes_raw || [];
  const monthlyList = data.quotes_monthly || [];

  const monthly = {};
  monthlyList.forEach((q) => {
    monthly[q.month] = (monthly[q.month] || 0) + Number(q.count || 0);
  });

  const daily = {};
  const byCategory = {};

  rawList.forEach((q) => {
    if (q.date) {
      daily[q.date] = (daily[q.date] || 0) + 1;
      const m = q.date.slice(0, 7);
      const cat = q.category || '기타';
      byCategory[m] = byCategory[m] || {};
      byCategory[m][cat] = (byCategory[m][cat] || 0) + 1;
    }
  });

  const result = {
    asOf: new Date().toISOString().slice(0, 10),
    source: '구글 스프레드시트(고도몰 es_dbkEstimate DB 실접수 내역) 연동',
    note: '견적 요청 실제 접수 건수 (월별 및 일별 실데이터)',
    monthly,
    daily,
    byCategory,
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(result, null, 2), 'utf8');
  console.log(`✅ ${OUT_FILE} 생성 완료 (총 ${Object.keys(monthly).length}개월, ${rawList.length}건 실데이터)`);
}

main().catch((err) => {
  console.error('실패:', err);
  process.exit(1);
});
