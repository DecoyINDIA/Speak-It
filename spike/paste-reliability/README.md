# Paste Reliability Prototype

Use this workstream to prove the Windows insertion path before building Phase 1.

## Test Method

- Test each app in `matrix.csv`.
- Use at least 20 attempts per app.
- Count direct paste success and copied-fallback success separately.
- Treat secure fields as expected copy-only behavior, not paste failures, when the app correctly avoids auto-paste.
- Record median insert time from final text received to text visible or copied.

## Pass Gate

Across the full 10-app matrix, direct paste plus copied fallback must succeed at least 95% of attempts.

## Notes To Capture

- Required paste shortcut per app, such as `Ctrl+V` or `Ctrl+Shift+V`.
- Whether the app runs elevated.
- Whether focus changed between recording and insertion.
- Clipboard restore failures.

