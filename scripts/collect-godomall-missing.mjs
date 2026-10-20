import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { processStats } from './process-godomall-stats.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CDP_PORT = 9222;
const OUT_FILE = path.join(ROOT, 'data/ref/godomall-scraped-raw.json');

function log(msg) {
  console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

async function main() {
  log('Playwright로 열려 있는 Chrome (포트 9222) 연결 중...');
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
  const context = browser.contexts()[0];

  log('사용자 고도몰 로그인 대기 중... (화면에 뜬 창에서 로그인해 주세요)');

  let activePage = null;
  while (!activePage) {
    for (const p of context.pages()) {
      const u = p.url();
      if (u.includes('gdadmin.itket.com') || u.includes('godomall.com')) {
        const isLogin = u.includes('login.php') || u.includes('/base/login');
        if (!isLogin) {
          activePage = p;
          break;
        }
      }
    }
    if (!activePage) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  log(`>>> 로그인 감지 성공! 현재 URL: ${activePage.url()} <<<`);

  // 브라우저 컨텍스트 내에서 fetch를 이용해 원본 통계 HTML 3종을 직접 수집
  log('통계 데이터 수집 시작 (2025.08 ~ 2026.06)...');
  const scrapedData = await activePage.evaluate(async () => {
    const qM = 'treatDate[start]=2025-08-01&treatDate[end]=2026-06-30&treatDate[startYear]=2025&treatDate[startMonth]=08&treatDate[endYear]=2026&treatDate[endMonth]=06&startDate=2025-08-01&endDate=2026-06-30';
    const qD = 'treatDate[start]=2025-08-01&treatDate[end]=2026-06-30&startDate=2025-08-01&endDate=2026-06-30&pageNum=1000';

    const f = async (path, query) => {
      try {
        const res = await fetch(path + '?' + query, { credentials: 'include' });
        return await res.text();
      } catch (e) {
        return '';
      }
    };

    const vm = await f('/statistics/visit_month.php', qM);
    const mm = await f('/statistics/member_month.php', qM);
    const vd = await f('/statistics/visit_day.php', qD);

    return { vm, mm, vd };
  });

  fs.writeFileSync(OUT_FILE, JSON.stringify(scrapedData, null, 2), 'utf8');
  log(`원본 HTML 수집 완료! 저장: ${OUT_FILE}`);

  // 데이터 가공 및 ga4 폴더 반영, 대시보드 자동 빌드
  processStats(scrapedData);
  log('🎉 2025.08 ~ 2026.06 모든 통계 데이터 연동 및 대시보드 반영 완료!');
}

main().catch((e) => {
  console.error('에러 발생:', e);
});
