// data/ga4/*.json → site/ (React + TypeScript + SCSS + Vite 빌드)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const DATA = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(ROOT, 'data');

const dir = path.join(DATA, 'ga4');
const files = fs.existsSync(dir)
  ? fs
      .readdirSync(dir)
      .filter((f) => /^\d{4}-\d{2}\.json$/.test(f))
      .sort()
  : [];
const metaFile = path.join(dir, '_meta.json');
const meta = fs.existsSync(metaFile)
  ? JSON.parse(fs.readFileSync(metaFile, 'utf8'))
  : { updated: null };

await build({
  root: ROOT,
  configFile: path.join(ROOT, 'vite.config.ts'),
  logLevel: 'warn',
});

console.log(
  `site/index.html 생성: ${files.length}개월, 갱신 ${meta.updated || '없음'}`,
);
