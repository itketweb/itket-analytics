// data/YYYY-MM/*.xlsx → reports/YYYY-MM.html (+ index.html, latest.html)
// 파일명 규칙: <메뉴>__<옵션>.xlsx  (예: 인기페이지__PC.xlsx, 인기페이지__모바일웹.xlsx)
//   옵션(라디오·탭 값)이 없으면 <메뉴>.xlsx
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const DATA = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data');
const OUT = process.env.OUT_DIR ? path.resolve(process.env.OUT_DIR) : path.join(ROOT, 'reports');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'menus.json'), 'utf8'));
const template = fs.readFileSync(path.join(here, 'template.html'), 'utf8');

const norm = (s) => String(s).toLowerCase().replace(/[\s_\-().]/g, '');
const menuIndex = new Map();
for (const m of cfg.menus) for (const n of [m.name, m.key, ...(m.aliases || [])]) menuIndex.set(norm(n), m);

const parseNum = (v) => {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') return null;
  const t = v.trim().replace(/,/g, '');
  return /^-?\d+(\.\d+)?%?$/.test(t) ? parseFloat(t) : null;
};
const maskIp = (v) => (typeof v === 'string' ? v.replace(/\b(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}\b/g, '$1.***') : v);

function readTables(file, mask) {
  const wb = XLSX.readFile(file, { cellDates: false });
  const sheets = [];
  for (const name of wb.SheetNames) {
    let rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '', raw: false });
    rows = rows
      .map((r) => r.map((c) => (typeof c === 'string' ? c.trim() : c)))
      .filter((r) => r.some((c) => c !== '' && c != null));
    if (!rows.length) continue;
    const hi = rows.findIndex((r) => r.filter((c) => c !== '').length >= 2);
    if (hi < 0) continue;
    const header = rows[hi].map((c, i) => String(c || `열${i + 1}`));
    const body = rows.slice(hi + 1).map((r) => header.map((_, i) => (mask ? maskIp(r[i] ?? '') : r[i] ?? '')));
    sheets.push({ name, note: rows.slice(0, hi).map((r) => r.filter(Boolean).join(' ')).filter(Boolean).join(' / '), header, rows: body });
  }
  return sheets;
}

function loadMonth(month) {
  const dir = path.join(DATA, month);
  const result = new Map(); // menuKey -> { menu, options: Map(optionName -> sheets) }
  const unknown = [];
  for (const f of fs.readdirSync(dir).sort()) {
    if (!/\.(xlsx|xls|csv)$/i.test(f)) continue;
    const base = f.replace(/\.[^.]+$/, '');
    const [menuPart, ...optParts] = base.split('__');
    const menu = menuIndex.get(norm(menuPart));
    if (!menu) { unknown.push(f); continue; }
    const option = optParts.join(' / ') || '전체';
    const mask = (cfg.maskIpMenus || []).includes(menu.key);
    try {
      const sheets = readTables(path.join(dir, f), mask);
      if (!result.has(menu.key)) result.set(menu.key, { menu, options: [] });
      result.get(menu.key).options.push({ option, file: f, sheets });
    } catch (e) {
      unknown.push(`${f} (읽기 실패: ${e.message})`);
    }
  }
  return { result, unknown };
}

function kpiValue(entry, kpi) {
  if (!entry) return null;
  const re = new RegExp(kpi.column, 'i');
  const vals = [];
  for (const o of entry.options) for (const s of o.sheets) {
    const ci = s.header.findIndex((h) => re.test(h));
    if (ci < 0) continue;
    for (const r of s.rows) {
      if (/^(합계|총계|전체|계)$/.test(String(r[0]).trim())) continue; // 합계행 이중집계 방지
      const n = parseNum(r[ci]);
      if (n != null) vals.push(n);
    }
    if (vals.length) break;
  }
  if (!vals.length) return null;
  const sum = vals.reduce((a, b) => a + b, 0);
  return kpi.agg === 'avg' ? sum / vals.length : sum;
}

function buildMonth(month, months) {
  const { result, unknown } = loadMonth(month);
  const idx = months.indexOf(month);
  const prev = idx > 0 ? loadMonth(months[idx - 1]).result : null;
  const menus = cfg.menus.map((m) => {
    const e = result.get(m.key);
    return {
      key: m.key,
      name: m.name,
      missing: !e,
      options: e ? e.options.map((o) => ({ option: o.option, file: o.file, sheets: o.sheets })) : [],
    };
  });
  const kpis = cfg.kpis.map((k) => ({
    label: k.label,
    value: kpiValue(result.get(k.menu), k),
    prev: prev ? kpiValue(prev.get(k.menu), k) : null,
  }));
  // 전월 비교용: menuKey|option|sheet|첫열값|열이름 -> 값
  const prevMap = {};
  if (prev) {
    for (const [key, e] of prev) for (const o of e.options) for (const s of o.sheets) {
      for (const r of s.rows) s.header.forEach((h, ci) => {
        const n = parseNum(r[ci]);
        if (ci > 0 && n != null) prevMap[[key, o.option, s.name, r[0], h].join('|')] = n;
      });
    }
  }
  return { month, prevMonth: prev ? months[idx - 1] : null, menus, kpis, prevMap, unknown, generated: new Date().toISOString() };
}

const jsonForHtml = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, '');

fs.mkdirSync(OUT, { recursive: true });
const months = fs.existsSync(DATA)
  ? fs.readdirSync(DATA).filter((d) => /^\d{4}-\d{2}$/.test(d) && fs.statSync(path.join(DATA, d)).isDirectory()).sort()
  : [];
if (!months.length) { console.log('data/YYYY-MM/ 폴더에 엑셀이 없어 생성할 리포트가 없습니다.'); process.exit(0); }

const summary = [];
for (const m of months) {
  const rep = buildMonth(m, months);
  fs.writeFileSync(path.join(OUT, `${m}.html`), template.replace('/*__DATA__*/null', jsonForHtml(rep)));
  const have = rep.menus.filter((x) => !x.missing).length;
  summary.push({ month: m, have, total: rep.menus.length, missing: rep.menus.filter((x) => x.missing).map((x) => x.name), unknown: rep.unknown, kpis: rep.kpis });
  console.log(`${m}: 메뉴 ${have}/${rep.menus.length}${rep.unknown.length ? `, 인식 못한 파일 ${rep.unknown.length}` : ''}`);
}
const latest = months[months.length - 1];
fs.copyFileSync(path.join(OUT, `${latest}.html`), path.join(OUT, 'latest.html'));
fs.writeFileSync(path.join(OUT, 'index.html'), template.replace('/*__DATA__*/null', jsonForHtml({ index: summary.reverse() })));
fs.writeFileSync(path.join(OUT, 'status.json'), JSON.stringify(summary, null, 2));
