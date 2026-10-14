// 상품번호·카테고리 코드·게시판 ID → 이름. 공개 쇼핑몰 페이지에서 읽어 data/names.json 에 저장한다.
// 이미 알고 있는 항목은 다시 조회하지 않는다. 한 번에 최대 MAX_NEW 개만 조회 (나머지는 다음 실행에서).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'ga4.json'), 'utf8'));
const BASE = (cfg.siteUrl || 'https://itket.com').replace(/\/$/, '');
const MAX_NEW = 250;
const SHOW = { goods: 30, categories: 30, boards: 10 };           // 대시보드에 보이는 순위까지만
const URL_OF = {
  goods: (id) => `/goods/goods_view.php?goodsNo=${id}`,
  categories: (id) => `/goods/goods_list.php?cateCd=${id}`,
  boards: (id) => `/board/list.php?bdId=${id}`,
};

const dec = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim();
function nameOf(kind, html) {
  let m;
  if (kind === 'goods') m = html.match(/name=["']twitter:title["'][^>]*content=["']([^"']+)/i) || html.match(/property=["']og:title["'][^>]*content=["']([^"']+)/i);
  else m = html.match(/<h2[^>]*>\s*([^<]{1,60}?)\s*<\/h2>/i) || html.match(/<title>([^<]+)<\/title>/i);   // 카테고리·게시판은 페이지 제목 h2
  const n = m ? dec(m[1]) : '';
  return /^아이티켓 - /.test(n) ? '' : n;                                 // 사이트 공통 제목이면 이름 없음 처리
}

const file = path.join(DATA, 'names.json');
const names = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
for (const k of Object.keys(URL_OF)) names[k] ||= {};

const dir = path.join(DATA, 'ga4');
const todo = new Map();
for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter((x) => /^\d{4}-\d{2}\.json$/.test(x)).sort().reverse() : []) {
  const m = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  for (const k of Object.keys(URL_OF)) for (const r of (m[k] || []).slice(0, SHOW[k])) if (names[k][r.id] === undefined) todo.set(`${k}:${r.id}`, [k, r.id]);
}
const list = [...todo.values()].slice(0, MAX_NEW);
console.log(`이름 조회 대상 ${todo.size}개 중 ${list.length}개`);
let ok = 0, fail = 0;
for (let i = 0; i < list.length; i += 5) {
  await Promise.all(list.slice(i, i + 5).map(async ([k, id]) => {
    try {
      const r = await fetch(BASE + URL_OF[k](id), { headers: { 'user-agent': 'Mozilla/5.0 itket-analytics' }, signal: AbortSignal.timeout(20000) });
      if (!r.ok) throw new Error(r.status);
      const n = nameOf(k, await r.text());
      names[k][id] = n; n ? ok++ : fail++;
    } catch { fail++; }                                        // 실패는 저장하지 않아 다음에 다시 시도
  }));
}
fs.writeFileSync(file, JSON.stringify(names));
console.log(`이름 확보 ${ok}, 실패/빈 값 ${fail}`);
