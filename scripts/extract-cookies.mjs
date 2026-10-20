import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const masterKeyB64 = fs
  .readFileSync(path.join(os.tmpdir(), 'chrome_key_b64.txt'), 'ascii')
  .trim();
const masterKey = Buffer.from(masterKeyB64, 'base64');

// Profile 1의 Cookies 파일 복사
const cookiesSrc =
  'C:\\Users\\user\\AppData\\Local\\Google\\Chrome\\User Data\\Profile 1\\Network\\Cookies';
const cookiesDest = path.join(os.tmpdir(), 'Chrome_Cookies_Profile1');
fs.copyFileSync(cookiesSrc, cookiesDest);

const db = new DatabaseSync(cookiesDest);

function decryptValue(encrypted) {
  if (!encrypted || encrypted.length < 15) return '';
  const prefix = encrypted.subarray(0, 3).toString('utf8');
  if (prefix !== 'v10' && prefix !== 'v20') {
    return '';
  }
  const iv = encrypted.subarray(3, 15);
  const ciphertext = encrypted.subarray(15, encrypted.length - 16);
  const tag = encrypted.subarray(encrypted.length - 16);

  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch (e) {
    return '';
  }
}

const rows = db
  .prepare(
    "SELECT host_key, name, path, encrypted_value FROM cookies WHERE host_key LIKE '%itket%' OR host_key LIKE '%godomall%'",
  )
  .all();

console.log(`Found ${rows.length} cookies for itket/godomall.`);
const cookiesList = [];
for (const r of rows) {
  const val = decryptValue(r.encrypted_value);
  if (val) {
    console.log(`[Cookie] ${r.host_key} -> ${r.name}=${val.slice(0, 5)}...`);
    cookiesList.push(`${r.name}=${val}`);
  }
}

fs.writeFileSync(
  path.join(os.tmpdir(), 'godomall_cookies.txt'),
  cookiesList.join('; '),
  'utf8',
);
console.log('Saved cookies to godomall_cookies.txt');
