param(
    [string]$Configuration = "Release"
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = Join-Path $scriptDir "src\Program.cs"
$target = Join-Path $scriptDir "SpeakItHelper.exe"

$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) {
    $csc = "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"
}

$uiaClient = "C:\Windows\Microsoft.NET\assembly\GAC_MSIL\UIAutomationClient\v4.0_4.0.0.0__31bf3856ad364e35\UIAutomationClient.dll"
$uiaTypes = "C:\Windows\Microsoft.NET\assembly\GAC_MSIL\UIAutomationTypes\v4.0_4.0.0.0__31bf3856ad364e35\UIAutomationTypes.dll"
$winBase = "C:\Windows\Microsoft.NET\assembly\GAC_MSIL\WindowsBase\v4.0_4.0.0.0__31bf3856ad364e35\WindowsBase.dll"

Write-Host "Compiling SpeakItHelper.exe (net48) via $csc..."

& $csc /target:winexe /optimize+ /platform:anycpu /r:System.Windows.Forms.dll /r:System.Drawing.dll "/r:$uiaClient" "/r:$uiaTypes" "/r:$winBase" "/out:$target" "$src"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Successfully built $target" -ForegroundColor Green
} else {
    Write-Error "SpeakItHelper build failed with code $LASTEXITCODE"
}
