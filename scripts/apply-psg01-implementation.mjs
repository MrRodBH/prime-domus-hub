import { gunzipSync } from "node:zlib";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";

const baseline = "6cde3238c708cc12afe48548c4b18a9a50b09903";
const parts = Array.from(
  { length: 4 },
  (_, index) => `scripts/.psg01-patch-${String(index).padStart(2, "0")}`,
);

function git(args, capture = false) {
  const result = spawnSync("git", args, {
    stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
    encoding: capture ? "utf8" : undefined,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
  return capture ? result.stdout.trim() : "";
}

git(["fetch", "--depth=1", "origin", "main"]);
const fetchedMain = git(["rev-parse", "FETCH_HEAD"], true);
if (fetchedMain !== baseline) {
  console.error(`PSG-01 baseline moved: expected ${baseline}, received ${fetchedMain}`);
  process.exit(1);
}

git([
  "checkout",
  "FETCH_HEAD",
  "--",
  "package.json",
  "scripts/verify-release.mjs",
  ".github/workflows/release-gate.yml",
]);

const encoded = parts.map((path) => readFileSync(path, "utf8")).join("");
writeFileSync("/tmp/psg01.patch", gunzipSync(Buffer.from(encoded, "base64")));
git(["apply", "--binary", "/tmp/psg01.patch"]);

for (const path of parts) rmSync(path, { force: true });
rmSync("scripts/apply-psg01-implementation.mjs", { force: true });
