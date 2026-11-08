$ErrorActionPreference = "Stop"
$helperPath = Join-Path $PSScriptRoot "SpeakItHelper.exe"

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $helperPath
$psi.UseShellExecute = $false
$psi.RedirectStandardInput = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.CreateNoWindow = $true

$proc = [System.Diagnostics.Process]::Start($psi)

# 1. Read ready event
$ready = $proc.StandardOutput.ReadLine()
Write-Host "[1] Ready event: $ready"

# 2. Test ping
$proc.StandardInput.WriteLine('{"id":"ping-1","cmd":"ping"}')
$proc.StandardInput.Flush()
$ping = $proc.StandardOutput.ReadLine()
Write-Host "[2] Ping response: $ping"

# 3. Test get_context
$proc.StandardInput.WriteLine('{"id":"ctx-1","cmd":"get_context"}')
$proc.StandardInput.Flush()
$ctx = $proc.StandardOutput.ReadLine()
Write-Host "[3] Context response: $ctx"

# 4. Test set_hotkey
$proc.StandardInput.WriteLine('{"id":"hotkey-1","cmd":"set_hotkey","key":"Space","modifiers":["Alt"],"mode":"push_to_talk"}')
$proc.StandardInput.Flush()
$hk = $proc.StandardOutput.ReadLine()
Write-Host "[4] Hotkey response: $hk"

# 5. Test paste (clipboard swap test - dry_run to avoid pasting into active window)
$proc.StandardInput.WriteLine('{"id":"paste-1","cmd":"paste","text":"SpeakIt test text","mode":"dry_run"}')
$proc.StandardInput.Flush()
$pasteResp = $proc.StandardOutput.ReadLine()
Write-Host "[5] Paste response: $pasteResp"

# 6. Exit
$proc.StandardInput.WriteLine('{"id":"exit-1","cmd":"exit"}')
$proc.StandardInput.Flush()
$exitResp = $proc.StandardOutput.ReadLine()
Write-Host "[6] Exit response: $exitResp"

$proc.WaitForExit(3000)
Write-Host "Helper exit code: $($proc.ExitCode)"
