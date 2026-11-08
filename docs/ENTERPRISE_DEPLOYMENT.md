# SpeakIt Enterprise & Organisation Deployment Guide (BG11)

| | |
|---|---|
| Scope | Machine-wide deployment, silent unattended installation, and corporate policy enforcement |
| Target Audience | Enterprise IT Administrators, System Engineers, and Security Compliance Officers |

---

## 1. Silent Unattended Installation

SpeakIt uses a standard Nullsoft Scriptable Install System (NSIS) installer supporting silent installation flags for deployment via Microsoft Intune, SCCM / MECM, or custom PowerShell automation scripts:

```cmd
SpeakIt-Setup-0.9.0-beta.1.exe /S /ALLUSERS
```

### Installation Parameters:
- `/S` — Silent mode: runs silently without presenting user dialogs or setup wizards.
- `/D=C:\Program Files\SpeakIt` — Optional target directory specification (must be the final argument and unquoted).

---

## 2. Windows Group Policy & Registry Keys

Enterprise administrators can centrally lock SpeakIt configuration using Windows Group Policy (GPO) or MDM / Intune CSP scripts. SpeakIt automatically reads policies from:

```
HKLM\Software\Policies\SpeakIt
```
*(with fallback to `HKCU\Software\Policies\SpeakIt` for per-user policies)*

### Policy Configuration Keys:

| Registry Value Name | Type | Value / Format | Effect |
|---|---|---|---|
| `OfflineOnly` | `REG_DWORD` | `1` (or `0x00000001`) | **Mandatory Offline Mode:** Completely disables cloud provider endpoints (Groq, Gemini, Custom OpenAI). Locks transcription to bundled local `whisper.cpp`. Prevents corporate audio egress. |
| `AllowedProviders` | `REG_SZ` | `offline,groq` | Comma-separated list of approved providers. Unapproved providers are stripped from the pipeline. |
| `DisableHistory` | `REG_DWORD` | `1` | **Zero Local Retention:** Transcripts are pasted directly into target windows but never stored in local SQLite databases. |
| `RetentionDays` | `REG_DWORD` | `7`, `30`, `90` | Machine-wide maximum retention window for historical dictations. Overrides user preferences. |

### Example PowerShell GPO Provisioning Script:

```powershell
# Enforce 100% Offline Mode and Zero History for strict compliance
$regPath = "HKLM:\Software\Policies\SpeakIt"
if (-not (Test-Path $regPath)) {
    New-Item -Path $regPath -Force | Out-Null
}

# 1. Enforce Offline Only (no cloud STT/LLM egress)
Set-ItemProperty -Path $regPath -Name "OfflineOnly" -Value 1 -Type DWord

# 2. Disable Local SQLite History Storage
Set-ItemProperty -Path $regPath -Name "DisableHistory" -Value 1 -Type DWord

Write-Host "SpeakIt enterprise compliance policy configured successfully." -ForegroundColor Green
```

When an enterprise policy is detected, the SpeakIt settings interface displays a badge:
`🏢 Managed by your organisation` and disables tampering with governed policies.
