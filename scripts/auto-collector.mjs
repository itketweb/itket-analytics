import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LOG_FILE = path.join(ROOT, 'data/ref/auto-collector.log');
const OUT_FILE = path.join(ROOT, 'data/ref/godomall-stats.json');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  console.log(line.trim());
  fs.appendFileSync(LOG_FILE, line, 'utf8');
}

fs.writeFileSync(LOG_FILE, `=== 고도몰 자동 수집기 대기 시작 ===\n`, 'utf8');

async function main() {
  log('Chrome CDP (포트 9222) 연결 중...');
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];

  log('로그인 감지 대기 중... (화면의 Chrome 창에서 로그인해 주세요)');

  let targetPage = null;

  while (true) {
    const pages = context.pages();
    for (const p of pages) {
      const u = p.url();
      if (u.includes('gdadmin.itket.com')) {
        const isLogin = u.includes('login.php') || u.includes('/base/login');
        if (!isLogin) {
          targetPage = p;
          break;
        }
      }
    }

    if (targetPage) {
      log(`>>> 로그인 성공 감지! 현재 URL: ${targetPage.url()} <<<`);
      break;
    }

    await new Promise((res) => setTimeout(res, 3000));
  }

  // 로그인 성공 후 통계 페이지들 순회 수집
  const statUrls = [
    'https://gdadmin.itket.com/statistics/visit_month.php',
    'https://gdadmin.itket.com/statistics/visit_day.php',
    'https://gdadmin.itket.com/statistics/analytics_main.php',
    'https://gdadmin.itket.com/statistics/member_month.php',
  ];

  const scrapedData = {};

  for (const url of statUrls) {
    try {
      log(`통계 페이지 이동: ${url}`);
      await targetPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await targetPage.waitForTimeout(3000);

      const title = await targetPage.title();
      log(`페이지 도착: [${title}] URL: ${targetPage.url()}`);

      const screenshotName = url.split('/').pop().replace('.php', '') + '.png';
      await targetPage.screenshot({ path: path.join(ROOT, 'data/ref', screenshotName) });

      // 페이지 내 테이블 데이터 추출
      const pageInfo = await targetPage.evaluate(() => {
        const tables = Array.from(document.querySelectorAll('table')).map((tbl) => {
          return Array.from(tbl.querySelectorAll('tr')).map((tr) => {
            return Array.from(tr.querySelectorAll('th, td')).map((cell) => cell.innerText.trim());
          });
        });

        // 폼 인풋 및 기간 정보
        const inputs = Array.from(document.querySelectorAll('input, select')).map((el) => ({
          name: el.name || el.id,
          value: el.value,
          type: el.type,
        }));

        return { tables, inputs, text: document.body ? document.body.innerText.slice(0, 3000) : '' };
      });

      scrapedData[url] = pageInfo;
      log(`데이터 수집 완료 (${url}): 테이블 ${pageInfo.tables.length}개`);
    } catch (e) {
      log(`수집 중 에러 (${url}): ${e.message}`);
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(scrapedData, null, 2), 'utf8');
  log(`모든 통계 데이터 저장 완료 -> ${OUT_FILE}`);
  process.exit(0);
}

main().catch((err) => {
  log(`치명적 에러: ${err.message}`);
  process.exit(1);
});
