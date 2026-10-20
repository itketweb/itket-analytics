import { spawn } from 'node:child_process';
import http from 'node:http';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA = 'C:\\Users\\user\\.gemini\\chrome-debug-data';

console.log('Starting Chrome in foreground with debug logging...');
const child = spawn(
  CHROME_PATH,
  [
    '--remote-debugging-port=9222',
    `--user-data-dir=${USER_DATA}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--enable-logging=stderr',
    '--v=1',
    'https://gdadmin.itket.com/statistics/analytics_main.php'
  ],
  {
    stdio: 'inherit',
  }
);

child.on('exit', (code, signal) => {
  console.log(`Chrome exited with code ${code}, signal ${signal}`);
});
