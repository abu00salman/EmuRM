// Prints the headline facts from the evidence files written by scripts/rea-audit.sh.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] ?? "rea-evidence";
const read = (name) => {
  const file = join(dir, name);
  if (!existsSync(file)) return null;
  const text = readFileSync(file, "utf8");
  return JSON.parse(text.slice(text.indexOf("{")));
};
const result = (e) => e?.normalized_result ?? e?.summary?.normalized_result ?? e;
const lines = [];

const desktop = result(read("desktop-app.json"));
if (desktop) lines.push(`desktop-app: ${desktop.files?.length ?? 0} files, ${desktop.candidates?.length ?? 0} runtime candidates (${desktop.coverage?.status})`);

const web = read("web-app.json");
if (web) {
  const v = result(web);
  lines.push(`web app: view "${v?.kind ?? "summary"}", coverage ${v?.coverage?.status ?? "?"} (${v?.coverage?.examined ?? "?"}/${v?.coverage?.total ?? "?"} items)`);
}

const sig = result(read("apk-signature.json"));
if (sig) {
  const cert = sig.schemes?.v2?.signers?.[0]?.certificate ?? sig.schemes?.v1?.signers?.[0]?.certificate;
  const debugKey = /Android Debug/.test(cert?.subject ?? "");
  lines.push(`apk signature: v1 ${sig.schemes?.v1?.present ? "yes" : "no"}, v2 ${sig.schemes?.v2?.present ? "yes" : "no"}, signer ${String(cert?.subject).replace(/\n/g, " ")}${debugKey ? "  <-- DEBUG KEY, not releasable" : ""}`);
}

const pkg = result(read("apk-package.json"));
if (pkg) {
  const debuggable = /android:debuggable="true"/.test(pkg.manifest?.text ?? "");
  lines.push(`apk package: ${pkg.package_name} ${pkg.version_name} (code ${pkg.version_code}), minSdk ${pkg.min_sdk}, targetSdk ${pkg.target_sdk}${debuggable ? ", DEBUGGABLE" : ""}`);
  lines.push(`apk: ${pkg.class_count} classes, ${pkg.resource_count} resources, permissions: ${(pkg.permissions ?? []).join(", ")}`);
}

console.log(lines.join("\n") || "no evidence found in " + dir);
