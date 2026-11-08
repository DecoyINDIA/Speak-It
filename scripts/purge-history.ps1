# Purge sensitive reverse-engineering brief from git history (BG7)
# Prerequisites: git-filter-repo installed (`pip install git-filter-repo`)
# CAUTION: This rewrites all git commit hashes and requires a force push.

Write-Host "Checking for git-filter-repo..." -ForegroundColor Cyan
if (-not (Get-Command git-filter-repo -ErrorAction SilentlyContinue)) {
    Write-Warning "git-filter-repo is not installed. Run: pip install git-filter-repo"
    exit 1
}

$confirm = Read-Host "This will rewrite all git commit hashes to remove WISPR_FLOW_REVERSE_ENGINEERING_BRIEF.md. Proceed? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Aborted by user." -ForegroundColor Yellow
    exit 0
}

Write-Host "Purging file from entire git history..." -ForegroundColor Cyan
git filter-repo --path WISPR_FLOW_REVERSE_ENGINEERING_BRIEF.md --invert-paths --force

Write-Host "Verifying git history..." -ForegroundColor Cyan
$historyCheck = git log --all -- WISPR_FLOW_REVERSE_ENGINEERING_BRIEF.md
if (-not $historyCheck) {
    Write-Host "SUCCESS: WISPR_FLOW_REVERSE_ENGINEERING_BRIEF.md is completely purged from git history." -ForegroundColor Green
    Write-Host "Next step before making repo public: git push origin --force --all" -ForegroundColor Yellow
} else {
    Write-Error "Purge failed: file still detected in log."
}
