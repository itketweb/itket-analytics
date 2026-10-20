# 1. 기존 크롬 프로세스 모두 종료
Stop-Process -Name chrome -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

$desktop = [Environment]::GetFolderPath('Desktop')
$chromeExe = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$userData = 'C:\Users\user\AppData\Local\Google\Chrome\User Data Debug'
$targetUrl = 'https://gdadmin.itket.com/statistics/analytics_main.php'

# 2. 바로가기 생성
$wsh = New-Object -ComObject WScript.Shell
$sc = $wsh.CreateShortcut("$desktop\Chrome (원격디버깅).lnk")
$sc.TargetPath = $chromeExe
$sc.Arguments = "--remote-debugging-port=9222 --user-data-dir=`"$userData`" --new-window `"$targetUrl`""
$sc.IconLocation = "$chromeExe,0"
$sc.Save()

# 3. 바탕화면 실행 배치파일 생성
$batPath = "$desktop\Chrome_원격디버깅_실행.bat"
@"
@echo off
start "" "$chromeExe" --remote-debugging-port=9222 --user-data-dir="$userData" --new-window "$targetUrl"
"@ | Out-File -FilePath $batPath -Encoding oem

# 4. Windows Explorer를 통해 직접 실행 (사용자 대화형 세션 화면 표시)
Start-Process "explorer.exe" -ArgumentList "`"$batPath`""

Start-Sleep -Seconds 3

# 5. 포트 9222 상태 확인
Get-NetTCPConnection -LocalPort 9222 -ErrorAction SilentlyContinue | Format-List
