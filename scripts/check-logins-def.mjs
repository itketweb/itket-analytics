import { DatabaseSync } from 'node:sqlite';
import os from 'node:os';
import path from 'node:path';

const db = new DatabaseSync(path.join(os.tmpdir(), 'Chrome_Login_Data_Default'));
const rows = db
  .prepare(
    "SELECT origin_url, username_value FROM logins WHERE origin_url LIKE '%gdadmin%' OR origin_url LIKE '%itket%'",
  )
  .all();
console.log(JSON.stringify(rows, null, 2));
