Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class WinFinder {
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@

$list = @()
[WinFinder]::EnumWindows({
    param($hwnd, $lparam)
    $pidOut = 0
    [WinFinder]::GetWindowThreadProcessId($hwnd, [ref]$pidOut)
    $sb = New-Object System.Text.StringBuilder 256
    [WinFinder]::GetWindowText($hwnd, $sb, 256)
    $vis = [WinFinder]::IsWindowVisible($hwnd)
    $p = Get-Process -Id $pidOut -ErrorAction SilentlyContinue
    if ($p -and $p.ProcessName -eq 'chrome') {
        $script:list += [PSCustomObject]@{
            Handle = $hwnd
            Pid = $pidOut
            Visible = $vis
            Title = $sb.ToString()
        }
    }
    return $true
}, [IntPtr]::Zero)

$list | Format-Table -AutoSize
