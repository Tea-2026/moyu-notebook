# Releasing

## Version

The version lives in `native/Moyu.App.csproj` and in the web UI (`app.js`, `sw.js`). Bump all of them together.

## Local release build

Requirements:

- .NET 8 SDK
- Python 3.10+
- Inno Setup 6.5+ (`ISCC.exe` on `PATH`, or set `ISCC_PATH`)
- 7-Zip recommended for a smaller portable ZIP

```powershell
python tools/build_standalone.py
powershell -ExecutionPolicy Bypass -File tools/build-release.ps1
```

Outputs:

- `dist/release/Moyu-<version>-win-x64-setup.exe`
- `dist/release/Moyu-<version>-win-x64-portable.zip`
- `dist/release/Moyu-<version>-standalone.html`
- `dist/release/SHA256SUMS.txt`

## GitHub Actions

Push a tag such as `v3.3.0`. The Windows workflow builds the app, builds the installer, installs it silently into a temporary directory, checks the installed version, uninstalls it, and attaches the artifacts to the GitHub release.

If the installer check fails on a specific machine but passes in Actions, check the machine's `%TEMP%` ACLs and endpoint security first. The installer itself is per-user and does not require administrator rights.

## Signing

The current setup is unsigned. Windows SmartScreen may show "Unknown publisher" on first run. Do not publish your personal certificate or token in the repository.