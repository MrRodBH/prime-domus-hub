import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";

const baseline = "6cde3238c708cc12afe48548c4b18a9a50b09903";
const expectedEncodedLength = 41228;
const expectedEncodedDigest = "6942fdb12b73b19986e30815f8bab7572289280fcea30eee8d4ce59d5f24a334";
const expectedPatchDigest = "f64d6218482958e308ee7fa720f66fa88eeb8a9a3cd23c34f4aacf5c96dd4b24";
const parts = Array.from(
  { length: 4 },
  (_, index) => `scripts/.psg01-patch-${String(index).padStart(2, "0")}`,
);

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

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

git(["checkout", "FETCH_HEAD", "--", "package.json", "scripts/verify-release.mjs"]);

const partContents = parts.map((path) => readFileSync(path, "utf8"));
if (partContents[1].length !== 12001 || partContents[1][8954] !== "b") {
  console.error("PSG-01 verified transport insertion was not found at the expected position");
  process.exit(1);
}
partContents[1] = `${partContents[1].slice(0, 8954)}${partContents[1].slice(8955)}`;

partContents.forEach((content, index) => {
  console.log(`part-${index}: normalized-length=${content.length} sha256=${digest(content)}`);
});
const encoded = partContents.join("");
console.log(`encoded: length=${encoded.length} sha256=${digest(encoded)}`);
if (encoded.length !== expectedEncodedLength || digest(encoded) !== expectedEncodedDigest) {
  console.error("PSG-01 encoded patch integrity mismatch");
  process.exit(1);
}

const patch = gunzipSync(Buffer.from(encoded, "base64"));
console.log(`patch: length=${patch.length} sha256=${digest(patch)}`);
if (digest(patch) !== expectedPatchDigest) {
  console.error("PSG-01 decoded patch integrity mismatch");
  process.exit(1);
}
writeFileSync("/tmp/psg01.patch", patch);

git(["apply", "--check", "--binary", "/tmp/psg01.patch"]);
git(["apply", "--verbose", "--binary", "/tmp/psg01.patch"]);

for (const path of parts) rmSync(path, { force: true });
rmSync("scripts/apply-psg01-implementation.mjs", { force: true });
rmSync("psg01-patch-01.txt", { force: true });
