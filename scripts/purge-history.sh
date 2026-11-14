#!/usr/bin/env bash
set -euo pipefail

# Purge sensitive reverse-engineering brief from git history (BG7)
echo "Checking for git-filter-repo..."
if ! command -v git-filter-repo &> /dev/null; then
    echo "git-filter-repo is required. Install via: pip install git-filter-repo"
    exit 1
fi

read -p "This will rewrite all git commit hashes to remove WISPR_FLOW_REVERSE_ENGINEERING_BRIEF.md. Proceed? [y/N]: " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "Aborted."
    exit 0
fi

echo "Purging file from entire git history..."
git filter-repo --path WISPR_FLOW_REVERSE_ENGINEERING_BRIEF.md --invert-paths --force

echo "Verifying history..."
if [ -z "$(git log --all -- WISPR_FLOW_REVERSE_ENGINEERING_BRIEF.md)" ]; then
    echo "SUCCESS: File successfully removed from all commits."
    echo "To push rewritten history: git push origin --force --all"
else
    echo "ERROR: File still present in git history."
    exit 1
fi
