// data/ga4/*.json → site/index.html (단일 파일, 데이터 내장)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const DATA = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data');
const SITE = process.env.SITE_DIR ? path.resolve(process.env.SITE_DIR) : path.join(ROOT, 'site');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'ga4.json'), 'utf8'));
const dir = path.join(DATA, 'ga4');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^\d{4}-\d{2}\.json$/.test(f)).sort() : [];
const months = {};
for (const f of files) months[f.slice(0, 7)] = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const metaFile = path.join(dir, '_meta.json');
const meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf8')) : { updated: null };
const namesFile = path.join(DATA, 'names.json');
const names = fs.existsSync(namesFile) ? JSON.parse(fs.readFileSync(namesFile, 'utf8')) : {};
const refFile = path.join(DATA, 'ref', 'godomall-signups.json');
const godoSignups = fs.existsSync(refFile) ? JSON.parse(fs.readFileSync(refFile, 'utf8')) : null;
const payload = { names, godoSignups, title: cfg.title, siteUrl: cfg.siteUrl, internal: cfg.internalFilter || { state: 'pending', since: null }, meta, months, liveUrl: process.env.GA4_WEBAPP_URL || '' };
const json = JSON.stringify(payload).replace(/</g, '\u003c');
const html = fs.readFileSync(path.join(here, 'site-template.html'), 'utf8').replace('"__DATA__"', () => json).replace(/__TITLE__/g, cfg.title);
fs.mkdirSync(SITE, { recursive: true });
fs.writeFileSync(path.join(SITE, 'index.html'), html);
console.log(`site/index.html 생성: ${files.length}개월, 갱신 ${meta.updated || '없음'}`);
