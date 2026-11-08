# Code Signing & Distribution Trust Strategy (BG9)

| | |
|---|---|
| Target | Eliminate SmartScreen warnings and antivirus false positives |
| Primary Route | **SignPath Foundation** (Free code signing for open-source projects) |
| Secondary Route | **Microsoft Store** (Free individual developer account) |

---

## 1. SignPath Foundation Open-Source Signing

SignPath Foundation provides free code signing certificates (via Certum trusted root CA) for qualifying open-source projects.

### Application Checklist & Prerequisites:
- [x] Repository is public on GitHub with an OSI-approved open source license (MIT).
- [x] Build scripts and source code are entirely transparent and reproducible.
- [x] History does not contain proprietary extracted assets (purged per BG7).
- [ ] Configure GitHub Actions workflow `.github/workflows/build.yml` with SignPath signing action:
  ```yaml
  - name: Sign Executable
    uses: signpath/github-action-submit-signing-request@v1
    with:
      api-token: ${{ secrets.SIGNPATH_API_TOKEN }}
      organization-id: ${{ secrets.SIGNPATH_ORG_ID }}
      project-slug: speakit
      signing-policy-slug: release-signing
  ```

---

## 2. Microsoft Store Submission Route

Microsoft announced free registration for individual developers. Publishing via the Microsoft Store eliminates SmartScreen warnings without needing an expensive third-party EV code signing certificate.

### Packaging with MSIX:
1. Use `electron-builder` with the target `appx` / `msix`:
   ```bash
   npx electron-builder --win appx
   ```
2. Ensure `package.json` contains store configuration:
   ```json
   "appx": {
     "identityName": "DecoyINDIA.SpeakIt",
     "publisher": "CN=DecoyINDIA",
     "publisherDisplayName": "DecoyINDIA",
     "applicationId": "com.speakit.app"
   }
   ```
3. Full-trust declaration in `appxmanifest.xml` for `WH_KEYBOARD_LL` low-level hook (`runFullTrust` capability).
