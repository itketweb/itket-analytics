import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const GA4_DIR = path.join(ROOT, 'data/ga4');

// PowerShell로 엑셀의 일자별 회원가입 데이터를 JSON으로 덤프
const dumpPs1 = `
$excelPath = 'C:\\Users\\user\\Downloads\\기간별운영성과_일자별분석_20261020.xlsx'
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
try {
    $wb = $excel.Workbooks.Open($excelPath)
    $ws = $wb.Sheets.Item(1)
    $rowCount = $ws.UsedRange.Rows.Count
    $list = @()
    for ($r = 2; $r -le $rowCount; $r++) {
        $dateStr = $ws.Cells.Item($r, 1).Text.Trim()
        if ($dateStr -match '^\\d{4}-\\d{2}-\\d{2}$') {
            $signupCount = [int]($ws.Cells.Item($r, 10).Text -replace '[^0-9]', '')
            if ($signupCount -gt 0) {
                $list += [PSCustomObject]@{ date = $dateStr; count = $signupCount }
            }
        }
    }
    $list | ConvertTo-Json -Compress
} finally {
    if ($wb) { $wb.Close($false) }
    $excel.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
}
`;

fs.writeFileSync(path.join(ROOT, 'scripts/dump-signups.ps1'), dumpPs1, 'utf8');

console.log('엑셀에서 일자별 회원가입 데이터 추출 중...');
const stdout = execSync('powershell -ExecutionPolicy Bypass -File scripts/dump-signups.ps1', { encoding: 'utf8' }).trim();
const signupsList = JSON.parse(stdout);
console.log(`추출된 회원가입 발생일 수: ${signupsList.length}건`);

// 월별로 그룹핑
const byMonth = {};
for (const item of signupsList) {
  const m = item.date.slice(0, 7);
  if (!byMonth[m]) byMonth[m] = [];
  byMonth[m].push(item);
}

// data/ga4/*.json 업데이트
for (const [m, list] of Object.entries(byMonth)) {
  const file = path.join(GA4_DIR, `${m}.json`);
  if (!fs.existsSync(file)) continue;
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));

  json.signups = list;
  const totalSignups = list.reduce((sum, cur) => sum + cur.count, 0);

  if (!json.conv) json.conv = { defs: [], total: {}, daily: {} };
  if (!json.conv.total) json.conv.total = {};
  json.conv.total.signup = { sessions: totalSignups, users: totalSignups };
  if (!json.conv.daily) json.conv.daily = {};
  json.conv.daily.signup = list;

  fs.writeFileSync(file, JSON.stringify(json, null, 2), 'utf8');
  console.log(`[완료] ${m}.json에 회원가입 ${totalSignups}건 (일자별 ${list.length}일) 반영`);
}
