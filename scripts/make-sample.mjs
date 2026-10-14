// 테스트용 가짜 엑셀을 .sample/data/ 에 만든다 (저장소에는 올라가지 않음)
import fs from 'node:fs';
import XLSX from 'xlsx';
const out = '.sample/data';
const days = (n, f) => [['일자', ...f.h], ...Array.from({ length: n }, (_, i) => [`2026-%M-${String(i + 1).padStart(2, '0')}`, ...f.r(i)])];
const write = (month, name, rows) => {
  fs.mkdirSync(`${out}/${month}`, { recursive: true });
  const ws = XLSX.utils.aoa_to_sheet(rows.map((r) => r.map((c) => (typeof c === 'string' ? c.replace('%M', month.slice(5)) : c))));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, `${out}/${month}/${name}.xlsx`);
};
for (const [month, k] of [['2026-09', 1], ['2026-10', 1.12]]) {
  const r = (i) => Math.round((300 + (i * 37) % 120) * k);
  write(month, '전체방문자수', days(30, { h: ['방문자 수', '신규 방문자'], r: (i) => [r(i), Math.round(r(i) * 0.6)] }));
  write(month, '전체페이지뷰', days(30, { h: ['페이지뷰'], r: (i) => [r(i) * 4] }));
  write(month, '회원가입수', days(30, { h: ['회원가입 수'], r: (i) => [(i * 7) % 5 + (k > 1 ? 1 : 0)] }));
  write(month, '인기페이지__PC', [['순위', '페이지', '페이지뷰', '방문자'], ...['/main/index.php', '/goods/goods_view.php?goodsNo=1', '/dbk/dbk_estimate_list.php', '/goods/goods_list.php'].map((p, i) => [i + 1, p, Math.round((900 - i * 200) * k), Math.round((500 - i * 90) * k)])]);
  write(month, '인기페이지__모바일웹', [['순위', '페이지', '페이지뷰', '방문자'], ...['/main/index.php', '/goods/goods_view.php?goodsNo=1'].map((p, i) => [i + 1, p, Math.round((700 - i * 150) * k), Math.round((400 - i * 80) * k)])]);
  write(month, 'IP유입내역', [['일시', 'IP', '유입경로'], ['2026-10-01 10:00', '203.0.113.42', 'google'], ['2026-10-01 11:20', '198.51.100.7', 'naver']]);
}
console.log('sample ready');
