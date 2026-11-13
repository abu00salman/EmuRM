#!/usr/bin/env bash
# Static audit of EmuRM's shipped artifacts with REA (https://github.com/morluto/rea, MIT).
# Runs entirely on Linux with Node.js, npm and a JDK. Nothing is executed from the targets:
# every command below reads files only. Evidence JSON is written to $OUT (default rea-evidence/).
#
#   npm run build && bash scripts/rea-audit.sh [path/to/app.apk]
set -euo pipefail

REA_VERSION="${REA_VERSION:-6.8.0}"
JADX_VERSION="0.7.1"
JADX_SHA256="6e5eacf500b64292bfb73c49797c1958f6ee44646e43e868039ae7feb573ff75"
OUT="${OUT:-rea-evidence}"
APK="${1:-}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$OUT"
rea() { npx --yes "rea-agents@${REA_VERSION}" "$@" 2> >(grep -v '"rea_progress"' >&2); }

echo "== desktop app (Electron main process, package.json)"
rea inspect-desktop-application "$ROOT/desktop-app" --json > "$OUT/desktop-app.json"

if [ -d "$ROOT/out/_next" ]; then
  echo "== web app JavaScript (static export: the app's own chunks; framework and emulator cores are excluded)"
  TMP="$(mktemp -d)"
  cp -r "$ROOT/out/_next" "$TMP/_next"
  cp "$ROOT/out/index.html" "$TMP/index.html"
  (cd "$TMP" && { find _next/static/chunks/app -name '*.js'; ls _next/static/chunks/rom-worker*.js; } \
    | node -e 'console.log(JSON.stringify(require("fs").readFileSync(0,"utf8").split("\n").filter(Boolean)))' > paths.json)
  rm -rf "$OUT/web-bundle-evidence"
  rea analyze-javascript-application "$TMP" --json --source-paths-json "$TMP/paths.json" \
    --detail summary --evidence_output "$OUT/web-bundle-evidence" --analysis-timeout-ms 600000 > "$OUT/web-app.json"
  rm -rf "$TMP"
fi

if [ -n "$APK" ]; then
  echo "== Android APK: signing"
  rea inspect-apk-signature "$APK" --json > "$OUT/apk-signature.json"
  echo "== Android APK: manifest, classes (JADX provider)"
  JAR="${REA_JADX_MCP_JAR:-$ROOT/.cache/jadx-headless-mcp-${JADX_VERSION}-all.jar}"
  if [ ! -f "$JAR" ]; then
    mkdir -p "$(dirname "$JAR")"
    curl -fL -o "$JAR" "https://github.com/1013503897/jadx-headless-mcp/releases/download/v${JADX_VERSION}/jadx-headless-mcp-${JADX_VERSION}-all.jar"
  fi
  echo "${JADX_SHA256}  ${JAR}" | sha256sum -c -
  REA_JADX_MCP_JAR="$JAR" rea inspect-android-package "$APK" --json > "$OUT/apk-package.json"
fi

node "$ROOT/scripts/rea-summary.mjs" "$OUT"
