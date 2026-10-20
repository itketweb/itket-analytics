import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_FILE = path.join(ROOT, 'data/ref/godomall-scraped-raw.json');

const server = http.createServer((req, res) => {
  // CORS 헤더 설정 (고도몰 관리자 도메인 및 로컬 fetch 허용)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, message: 'Server is running' }));
    return;
  }

  if (req.method === 'POST' && req.url === '/submit') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        fs.writeFileSync(OUT_FILE, JSON.stringify(data, null, 2), 'utf8');
        console.log(`\n[성공] 고도몰 원본 통계 데이터 수신 완료! (저장: ${OUT_FILE})`);

        // 파싱 및 데이터 반영 스크립트 호출
        import('./process-godomall-stats.mjs')
          .then((m) => {
            m.processStats(data);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, message: '2025.08~2026.06 통계 반영 완료!' }));
          })
          .catch((err) => {
            console.error('통계 가공 에러:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: err.message }));
          });
      } catch (e) {
        console.error('수신 데이터 파싱 에러:', e);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

const PORT = 9999;
server.listen(PORT, '127.0.0.1', () => {
  console.log(`=======================================================`);
  console.log(`[대기중] 통계 수신 서버 시작됨: http://127.0.0.1:${PORT}`);
  console.log(`=======================================================`);
});
