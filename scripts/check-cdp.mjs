import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const pages = context.pages();
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    console.log(`Page [${i}]:`, p.url(), await p.title());
    const snippet = await p.evaluate(() =>
      document.body ? document.body.innerText.slice(0, 200) : 'empty',
    );
    console.log(`Snippet [${i}]:`, snippet.replace(/\s+/g, ' '));
  }
  await browser.close();
}

main().catch(console.error);
