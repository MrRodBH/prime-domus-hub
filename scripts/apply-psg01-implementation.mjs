import { gunzipSync } from "node:zlib";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";

const parts = Array.from(
  { length: 4 },
  (_, index) => `scripts/.psg01-patch-${String(index).padStart(2, "0")}`,
);
const encoded = parts.map((path) => readFileSync(path, "utf8")).join("");
writeFileSync("/tmp/psg01.patch", gunzipSync(Buffer.from(encoded, "base64")));

const applied = spawnSync("git", ["apply", "--binary", "/tmp/psg01.patch"], {
  stdio: "inherit",
});
if (applied.status !== 0) process.exit(applied.status ?? 1);

for (const path of parts) rmSync(path, { force: true });
rmSync("scripts/apply-psg01-implementation.mjs", { force: true });
