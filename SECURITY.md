# Security

摸鱼笔记本 is a local-first Windows app. It does not have a cloud account or a remote sync service.

## Reporting

Please report security issues privately through GitHub's **Report a vulnerability** feature in the Security tab of this repository. Do not open a public issue for an unfixed vulnerability.

## What to include

- The affected version and Windows build.
- A minimal reproduction or relevant log.
- Whether the issue involves the local HTTP API, credentials, the vault, or the WebView2 bridge.

## Security model

- Notes, diary entries, plans, schedules, and password metadata live under `%LOCALAPPDATA%\Moyu`.
- The optional AES-256-GCM vault password is never sent anywhere.
- Local API keys are 40 characters of `A-Za-z0-9`, stored as SHA-256 hashes plus a Windows DPAPI-protected copy for the copy button. They are not returned over HTTP.
- The local API listens on `127.0.0.1` only, requires a Bearer key, and never returns password contents.
- The desktop app must be running for the local API to work.
- The installer is not code-signed yet; use the release checksums and prefer the source build if that matters to you.