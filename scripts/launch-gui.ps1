$sh = New-Object -ComObject Shell.Application
$sh.ShellExecute('C:\Program Files\Google\Chrome\Application\chrome.exe', '--remote-debugging-port=9222 --user-data-dir="C:\Users\user\.gemini\chrome-debug-data" --no-first-run --start-maximized "https://gdadmin.itket.com"', '', 'open', 1)
Start-Sleep -Seconds 3
Get-NetTCPConnection -LocalPort 9222 -ErrorAction SilentlyContinue | Format-List
