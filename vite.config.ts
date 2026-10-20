import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

/**
 * 릴리즈 표기: 배포 날짜(KST) 기준 YY.MM.DD, 당일 여러 번 배포 시 -2, -3 ...
 */
function releaseInfo(): { tag: string; commit: string } {
  const kstDay = (sec: number) =>
    new Date(sec * 1000 + 9 * 3600 * 1000)
      .toISOString()
      .slice(2, 10)
      .replace(/-/g, '.');

  try {
    const git = (cmd: string) =>
      execSync(`git ${cmd}`, {
        cwd: ROOT,
        stdio: ['ignore', 'pipe', 'ignore'],
      })
        .toString()
        .trim();

    const [sha, headSec] = git('log -1 --format=%h%x20%ct').split(' ');
    // 빌드 당일 KST 날짜
    const today = kstDay(Date.now() / 1000);
    const day = kstDay(Number(headSec)) === today ? today : today;
    const n = git('log --first-parent --format=%ct HEAD')
      .split('\n')
      .filter((s) => kstDay(Number(s)) === day).length;

    return { tag: `v${day}${n > 1 ? `-${n}` : ''}`, commit: sha };
  } catch {
    const today = kstDay(Date.now() / 1000);
    return { tag: `v${today}`, commit: '' };
  }
}
const release = releaseInfo();

export function loadDashboardPayload(mode = process.env.NODE_ENV || 'development') {
  const env = loadEnv(mode, ROOT, '');
  const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data');
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'ga4.json'), 'utf8'));
  const ga4Dir = path.join(dataDir, 'ga4');
  const files = fs.existsSync(ga4Dir)
    ? fs.readdirSync(ga4Dir).filter((f) => /^\d{4}-\d{2}\.json$/.test(f)).sort()
    : [];
  const months: Record<string, unknown> = {};
  for (const f of files) {
    months[f.slice(0, 7)] = JSON.parse(fs.readFileSync(path.join(ga4Dir, f), 'utf8'));
  }
  const metaFile = path.join(ga4Dir, '_meta.json');
  const meta = fs.existsSync(metaFile)
    ? JSON.parse(fs.readFileSync(metaFile, 'utf8'))
    : { updated: null };
  const namesFile = path.join(dataDir, 'names.json');
  const names = fs.existsSync(namesFile)
    ? JSON.parse(fs.readFileSync(namesFile, 'utf8'))
    : {};
  const refFile = path.join(dataDir, 'ref', 'godomall-signups.json');
  const godoSignups = fs.existsSync(refFile)
    ? JSON.parse(fs.readFileSync(refFile, 'utf8'))
    : null;

  return {
    fileCount: files.length,
    payload: {
      names,
      godoSignups,
      title: cfg.title as string,
      siteUrl: cfg.siteUrl as string,
      internal: cfg.internalFilter || { state: 'pending', since: null },
      meta,
      months,
      liveUrl: process.env.GA4_WEBAPP_URL || env.GA4_WEBAPP_URL || '',
    },
  };
}

function itketDataPlugin(): Plugin {
  return {
    name: 'itket-data-plugin',
    transformIndexHtml(html) {
      const { payload } = loadDashboardPayload();
      const json = JSON.stringify(payload).replace(/</g, '\\u003c');
      return html
        .replace(/__TITLE__/g, payload.title)
        .replace('"__DATA__"', () => json);
    },
  };
}

export default defineConfig(({ command }) => ({
  base: './',
  define: {
    __APP_RELEASE__: JSON.stringify(command === 'serve' ? `${release.tag}-dev` : release.tag),
    __APP_COMMIT__: JSON.stringify(release.commit),
  },
  server: {
    port: 1000,
    strictPort: true,
  },
  preview: {
    port: 1000,
    strictPort: true,
  },
  plugins: [react(), itketDataPlugin()],
  build: {
    outDir: process.env.SITE_DIR ? path.resolve(process.env.SITE_DIR) : path.join(ROOT, 'site'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
}));
