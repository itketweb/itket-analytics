// GA4 Data API 최소 클라이언트 (의존성 없음). 서비스 계정 JSON 키로 인증한다.
import crypto from 'node:crypto';

const b64u = (b) => Buffer.from(b).toString('base64url');

export async function getToken(key) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64u(JSON.stringify({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const sig = crypto.createSign('RSA-SHA256').update(`${head}.${claim}`).sign(key.private_key, 'base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claim}.${sig}` }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error(`토큰 발급 실패: ${j.error_description || j.error || res.status}`);
  return j.access_token;
}

export async function runReport(token, propertyId, body) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) return res.json();
    if ((res.status === 429 || res.status >= 500) && attempt < 4) { await new Promise((r) => setTimeout(r, 2000 * attempt)); continue; }
    const t = await res.text();
    throw new Error(`GA4 API ${res.status}: ${t.slice(0, 300)}`);
  }
}

// API 응답 → [{차원..., 지표...}] (지표는 숫자)
export function rows(resp) {
  const dh = (resp.dimensionHeaders || []).map((h) => h.name);
  const mh = (resp.metricHeaders || []).map((h) => h.name);
  return (resp.rows || []).map((r) => {
    const o = {};
    dh.forEach((n, i) => (o[n] = r.dimensionValues[i].value));
    mh.forEach((n, i) => (o[n] = Number(r.metricValues[i].value)));
    return o;
  });
}
