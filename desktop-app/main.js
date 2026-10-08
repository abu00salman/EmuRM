// EmuRM desktop shell (macOS/Windows/Linux). Loads the Gradle-style bundled web export
// (copied into desktop-app/web at build time — see package.json's "prebuild" script)
// over a custom "app://" scheme, never file://.
//
// file:// breaks every absolute asset path the static export emits (/_next/static/...,
// /manifest.webmanifest, ...) because "/" resolves to the filesystem root under that
// scheme, not the app's own directory — the same reason the Android build serves its
// bundled assets over a virtual https:// origin instead of file://. A custom scheme
// handler sidesteps that exactly the same way here.
const { app, protocol, BrowserWindow, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");

const SCHEME = "app";
const WEB_ROOT = path.join(__dirname, "web");

const MIME_TYPES = {
  html: "text/html",
  css: "text/css",
  js: "application/javascript",
  json: "application/json",
  webmanifest: "application/manifest+json",
  wasm: "application/wasm",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  xml: "application/xml",
  txt: "text/plain",
  md: "text/plain",
  glsl: "text/plain",
  glslp: "text/plain",
  zip: "application/zip",
};

protocol.registerSchemesAsPrivileged([
  {
    scheme: SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, allowServiceWorkers: true },
  },
]);

function resolveRequestPath(urlPath) {
  const decoded = decodeURIComponent(urlPath);
  let rel = decoded.replace(/^\/+/, "");
  if (rel === "" || rel.endsWith("/")) rel += "index.html";
  const resolved = path.normalize(path.join(WEB_ROOT, rel));
  // Reject path traversal straight away: a resolved path outside WEB_ROOT never serves.
  if (!resolved.startsWith(WEB_ROOT)) return null;
  return resolved;
}

async function respond(request) {
  const url = new URL(request.url);
  const filePath = resolveRequestPath(url.pathname);
  if (!filePath) return new Response("Not found", { status: 404 });
  try {
    const data = await fs.readFile(filePath);
    const ext = filePath.split(".").pop().toLowerCase();
    const mime = MIME_TYPES[ext] || "application/octet-stream";
    return new Response(data, { headers: { "Content-Type": mime } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 720,
    minHeight: 480,
    backgroundColor: "#080c14",
    title: "EmuRM",
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setMenuBarVisibility(false);
  win.loadURL(`${SCHEME}://local/`);

  // Keep external links (e.g. a game's homepage, from the Discover screen) in the
  // user's real browser instead of opening inside the app shell.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(`${SCHEME}://`)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

app.whenReady().then(() => {
  protocol.handle(SCHEME, respond);
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
