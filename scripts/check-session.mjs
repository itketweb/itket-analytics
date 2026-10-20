import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PROFILE_DIR = path.join(ROOT, 'data/ref/.browser-profile-1792394441303');

async function check() {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: true,
  });

  const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
  await page.goto('https://gdadmin.itket.com/statistics/analytics_main.php', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});

  console.log('최종 URL:', page.url());
  console.log('페이지 제목:', await page.title());

  const screenshotPath = path.join(ROOT, 'data/ref/current_check.png');
  await page.screenshot({ path: screenshotPath }).catch(() => {});
  console.log('스크린샷 저장:', screenshotPath);

  await context.close();
}

check().catch(console.error);
