import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PROFILE_DIR = path.join(ROOT, 'data/ref/.browser-profile-' + Date.now());
const LOG_FILE = path.join(ROOT, 'data/ref/collector.log');
const OUT_FILE = path.join(ROOT, 'data/ref/godomall-stats.json');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  console.log(line.trim());
  fs.appendFileSync(LOG_FILE, line, 'utf8');
}

fs.writeFileSync(LOG_FILE, `=== 고도몰 수집기 v3 시작 ===\n`, 'utf8');

async function main() {
  log('[1] 독립 Chromium 브라우저 기동 중...');
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: null,
    args: ['--start-maximized'],
  });

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  log('[2] 고도몰 관리자 로그인 페이지 이동: https://gdadmin.itket.com/base/login.php');
  try {
    await page.goto('https://gdadmin.itket.com/base/login.php', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
  } catch (e) {
    log(`초기 이동 에러: ${e.message}`);
  }

  const isActuallyLoggedIn = async (p) => {
    try {
      const u = p.url();
      if (u.includes('login.php') || u.includes('/base/login')) return false;
      const ok = await p.evaluate(() => {
        const text = document.body ? document.body.innerText : '';
        return text.includes('로그아웃') || text.includes('통계') || text.includes('기본설정');
      }).catch(() => false);
      return Boolean(ok);
    } catch {
      return false;
    }
  };

  log('[3] 관리자 로그인 대기 중... 화면에 새로 뜬 창에서 로그인해 주세요.');
  let activePage = null;

  for (let i = 0; i < 120; i++) { // 최대 6분 대기
    for (const p of context.pages()) {
      if (await isActuallyLoggedIn(p)) {
        activePage = p;
        break;
      }
    }
    if (activePage) {
      log(`>>> 로그인 성공 감지 완료! 활성 URL: ${activePage.url()} <<<`);
      break;
    }
    await page.waitForTimeout(3000);
  }

  if (!activePage) {
    log('로그인 제한 시간(6분) 초과로 종료합니다.');
    return;
  }

  const host = new URL(activePage.url()).origin;
  log(`[4] 관리자 호스트: ${host}`);

  const statPaths = [
    '/statistics/visit_month.php',
    '/statistics/visit_day.php',
    '/statistics/member_month.php',
  ];

  const results = {};

  for (const sp of statPaths) {
    const targetUrl = `${host}${sp}`;
    try {
      log(`[5] 이동: ${targetUrl}`);
      await activePage.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await activePage.waitForTimeout(3000);

      const title = await activePage.title();
      const currentUrl = activePage.url();

      // 기간 검색 폼이 있는 경우: 시작일 2025-08-01, 종료일 2026-07-31 설정 후 검색
      try {
        await activePage.evaluate(() => {
          const sDate = document.querySelector('input[name*="treatDate"][name*="start"], input[name*="startDate"], #treatDate_start');
          const eDate = document.querySelector('input[name*="treatDate"][name*="end"], input[name*="endDate"], #treatDate_end');
          if (sDate) sDate.value = '2025-08-01';
          if (eDate) eDate.value = '2026-07-31';

          const btn = document.querySelector('input[type="submit"], button[type="submit"], .btn-search, input[value*="검색"]');
          if (btn) btn.click();
        });
        await activePage.waitForTimeout(3000);
      } catch (e) {
        log(`기간 검색 생략: ${e.message}`);
      }

      // 테이블 데이터 추출
      const tableData = await activePage.evaluate(() => {
        const rows = [];
        document.querySelectorAll('table tr').forEach((tr) => {
          const cells = Array.from(tr.querySelectorAll('th, td')).map((c) => c.innerText.trim());
          if (cells.length > 0) rows.push(cells);
        });
        return rows;
      });

      const basename = path.basename(sp, '.php');
      results[basename] = {
        url: currentUrl,
        title,
        rows: tableData,
      };

      const shotPath = path.join(ROOT, `data/ref/godomall_${basename}.png`);
      await activePage.screenshot({ path: shotPath, fullPage: true }).catch(() => {});
      log(`수집 성공 (${basename}): 행 수 ${tableData.length}, 스크린샷: ${shotPath}`);
    } catch (err) {
      log(`통계 수집 에러 (${sp}): ${err.message}`);
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2), 'utf8');
  log(`[6] 모든 통계 데이터 저장 완료: ${OUT_FILE}`);
}

main().catch((err) => {
  log(`치명적 에러: ${err.stack || err.message}`);
});
