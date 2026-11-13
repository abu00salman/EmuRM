# REA in EmuRM

[REA](https://github.com/morluto/rea) (`rea-agents` 6.8.0, MIT) is a CLI and MCP server that inspects
apps and binaries and returns findings with their evidence. EmuRM uses it to audit its **own** shipped
artifacts. All of it runs on Linux (a cloud session or GitHub Actions), with nothing installed on a Mac.

## Scope

REA's own [DISCLAIMER](https://github.com/morluto/rea/blob/main/DISCLAIMER.md) excludes circumventing
DRM or anti-cheat, game cheats, and copying proprietary code or assets. EmuRM follows that: REA is
pointed at EmuRM's builds, the open-source cores it bundles, homebrew it hosts, and candidate ports
under evaluation. It is not used on commercial game data or protections.

## What was run (2026-10-25, Linux cloud sandbox, Node 22.22.2)

| Check | Result |
| --- | --- |
| Install `rea-agents@6.8.0` with npm, no root | works |
| MCP server (`rea mcp`, stdio) | works: handshake, 229 tools listed, a real tool call returned evidence |
| `inspect-desktop-application` on `desktop-app/` | works: 9 files, complete coverage |
| `analyze-javascript-application` on the app's own web chunks | works: 19 files parsed, 71 modules, 417 findings, 0 parse failures (27 s) |
| Same command on the whole `out/` (framework, emulator-core glue) | **timed out** at the default 300 s, so the audit selects only the app's own chunks |
| `inspect-apk-signature` / `inspect-artifact` on an APK | works (static) |
| `inspect-android-package` (needs the JADX provider jar) | works after fetching `jadx-headless-mcp-0.7.1` and checking its published SHA-256: 3,063 classes, manifest, permissions |
| `rea doctor` | reports unhealthy: Node 22.22.2 is below REA's required 22.23.4, and no Hopper/Ghidra/IDA. The static commands above still ran fine; native decompilation was **not** tried |

Not tried: native analysis (Hopper / Ghidra / IDA), `inspect-wasm-artifact` (needs WABT 1.0.42, which
couldn't be fetched in the sandbox), browser observation of emurm.com, `compare-application-versions`.

## Findings about EmuRM from the first run

The APK analyzed was the old RG353V debug build (`com.emurm.app.rg353v.debug`, 1.1):

- signed with the **Android debug key** (valid to 2056) and `android:debuggable="true"`: fine for
  sideloading a test build, not for a store release;
- `targetSdk 29`: below what Google Play now requires;
- permissions: `INTERNET`, `ACCESS_NETWORK_STATE`, `READ_EXTERNAL_STORAGE`.

## Use

```bash
npm run build
bash scripts/rea-audit.sh [path/to/app.apk]   # evidence in rea-evidence/, headline facts printed
```

The script pins REA 6.8.0, downloads the JADX provider jar only when an APK is given, and verifies
the jar's SHA-256. The `REA audit` workflow (`.github/workflows/rea-audit.yml`, manual run) does the
web and desktop part in Actions and uploads the evidence. It has not been run in Actions yet.

## MCP in Claude Code

`.mcp.json` registers `npx -y rea-agents@6.8.0 mcp`, so a Claude Code session in this repo gets REA's
tools after approving the server. Example prompts:

- "Use REA to list the routes and external requests in the web build."
- "Compare the last two APKs with REA and tell me what changed."

## Next uses (ideas, not done)

- Gate releases on the APK checks above (debug key, debuggable, targetSdk).
- Vet candidate WASM game ports (OpenTTD, OpenTyrian, ...) for their host imports before bundling.
- Compare two web builds (`compare-application-versions`) to catch accidental bundle growth.

Developed by abu00salman.
