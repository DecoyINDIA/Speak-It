# Git History Security Purge Guide (BG7)

| | |
|---|---|
| Target File | `WISPR_FLOW_REVERSE_ENGINEERING_BRIEF.md` |
| Risk Severity | High (Legal / IP clean-room separation per PLAN.md §3 & R8) |
| Impact | Rewrites all commit hashes in git history; requires force push |

---

## 1. Why Git History Must Be Purged

`WISPR_FLOW_REVERSE_ENGINEERING_BRIEF.md` was committed to the repository in commit `42ff8c6`. Merely running `git rm` or deleting the file in a new commit leaves the full file content accessible in git history to anyone who clones or views the public GitHub repository.

Before the repository is made public (such as when applying for open-source code signing via SignPath, or launching v1.0), this file must be completely purged from the repository object database so that zero third-party proprietary reverse-engineering notes remain.

---

## 2. Execution Steps

1. **Backup Repository:**
   Make a clean backup copy of the `.git` folder or clone into a temporary directory.

2. **Execute Purge Script:**
   - **PowerShell (Windows):**
     ```powershell
     powershell -ExecutionPolicy Bypass -File scripts/purge-history.ps1
     ```
   - **Bash (Linux / macOS / WSL):**
     ```bash
     bash scripts/purge-history.sh
     ```

3. **Verify:**
   Confirm that git log returns nothing for the purged file:
   ```bash
   git log --all -- WISPR_FLOW_REVERSE_ENGINEERING_BRIEF.md
   ```

4. **Force Push to GitHub:**
   Once verified locally and approved by repo owner:
   ```bash
   git push origin --force --all
   git push origin --force --tags
   ```
