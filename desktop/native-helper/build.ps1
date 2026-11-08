$ErrorActionPreference = "Stop"
$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
$outDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$uiaClient = "C:\Windows\Microsoft.NET\assembly\GAC_MSIL\UIAutomationClient\v4.0_4.0.0.0__31bf3856ad364e35\UIAutomationClient.dll"
$uiaTypes = "C:\Windows\Microsoft.NET\assembly\GAC_MSIL\UIAutomationTypes\v4.0_4.0.0.0__31bf3856ad364e35\UIAutomationTypes.dll"
$winBase = "C:\Windows\Microsoft.NET\assembly\GAC_MSIL\WindowsBase\v4.0_4.0.0.0__31bf3856ad364e35\WindowsBase.dll"

$src = Join-Path $outDir "SpeakItHelper.cs"
$target = Join-Path $outDir "SpeakItHelper.exe"

Write-Host "Compiling SpeakItHelper.exe via csc.exe..."
& $csc /target:winexe /optimize+ /platform:anycpu /r:System.Windows.Forms.dll "/r:$uiaClient" "/r:$uiaTypes" "/r:$winBase" "/out:$target" "$src"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Successfully compiled $target" -ForegroundColor Green
} else {
    Write-Error "Compilation failed with exit code $LASTEXITCODE"
}
