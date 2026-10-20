import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const src =
  'C:\\Users\\user\\AppData\\Local\\Google\\Chrome\\User Data\\Profile 1\\History';
const dest = path.join(os.tmpdir(), 'Chrome_History_Profile1');
fs.copyFileSync(src, dest);

const db = new DatabaseSync(dest);
const rows = db
  .prepare(
    'SELECT url, title, CAST(last_visit_time AS TEXT) as t FROM urls ORDER BY last_visit_time DESC LIMIT 10',
  )
  .all();
console.log(JSON.stringify(rows, null, 2));
