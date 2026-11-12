#!/usr/bin/env node
/**
 * Workers Builds sets WRANGLER_CI_MATCH_TAG on non-production branches to a
 * script tag that does not belong to the emurm Worker. Wrangler then reports
 * a name mismatch and the preview check fails. `npx wrangler` uses this shim.
 * Production (branch main) keeps the variable so the real check still runs.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const real = path.join(root, "node_modules/wrangler/bin/wrangler.js");
const bin = path.join(root, "node_modules/.bin/wrangler");
if (!fs.existsSync(real)) process.exit(0);

const wrapper = `#!/bin/sh
if [ "$WORKERS_CI_BRANCH" != "" ] && [ "$WORKERS_CI_BRANCH" != "main" ]; then
  unset WRANGLER_CI_MATCH_TAG
fi
ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
exec node "$ROOT/node_modules/wrangler/bin/wrangler.js" "$@"
`;
fs.unlinkSync(bin);
fs.writeFileSync(bin, wrapper, { mode: 0o755 });
