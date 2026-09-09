import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { sourceIdentity, releaseIdentity } from "../../scripts/release-identity";

const temp = mkdtempSync(join(tmpdir(), "rm-release-"));
try {
  const root = join(temp, "source"), exported = join(temp, "exported");
  mkdirSync(root);
  for (const dir of ["src", "public", "scripts"]) mkdirSync(join(root, dir));
  for (const file of ["package.json", "bun.lock", "tsconfig.json", "vite.config.ts", "src/app.ts"])
    writeFileSync(join(root, file), "fixture");
  const git = (...args: string[]) => execFileSync("git", args, { cwd: root, stdio: "pipe" });
  git("init"); git("add", "."); git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-m", "fixture");
  const initial = releaseIdentity(root);
  assert.equal(initial.dirty, false);
  assert.match(initial.commit!, /^[0-9a-f]{40,64}$/);
  cpSync(root, exported, { recursive: true }); rmSync(join(exported, ".git"), { recursive: true });
  const archive = releaseIdentity(exported);
  assert.equal(archive.commit, null); assert.equal(archive.dirty, null);
  assert.deepEqual(archive.source, initial.source, "same bytes without Git produce identical source proof");
  writeFileSync(join(exported, ".env"), "SECRET=do-not-expose");
  writeFileSync(join(exported, "src/routeTree.gen.ts"), "generated");
  assert.deepEqual(sourceIdentity(exported), initial.source, "environment and generated route tree excluded explicitly");
  writeFileSync(join(exported, "src/app.ts"), "changed");
  assert.notEqual(sourceIdentity(exported).sha256, initial.source.sha256);
  writeFileSync(join(exported, "src/app.ts"), "fixture");
  writeFileSync(join(exported, "public/added.svg"), "asset");
  assert.notEqual(sourceIdentity(exported).sha256, initial.source.sha256);
  rmSync(join(exported, "public/added.svg"));
  rmSync(join(exported, "src/app.ts"));
  assert.notEqual(sourceIdentity(exported).sha256, initial.source.sha256);
  symlinkSync(join(root, "src/app.ts"), join(exported, "src/link.ts"));
  assert.throws(() => sourceIdentity(exported), /symlinks/);
  writeFileSync(join(root, "src/untracked.ts"), "new code");
  assert.equal(releaseIdentity(root).dirty, true, "untracked inputs must not claim clean");
  rmSync(join(root, "bun.lock"));
  assert.throws(() => sourceIdentity(root), /ENOENT/, "missing mandatory input fails build");
  console.log("PASS release identity: Git-free archive, changed/added/deleted inputs, symlinks, mandatory input and unknown Git state");
} finally { rmSync(temp, { recursive: true, force: true }); }
console.log("Approved source comparison:", JSON.stringify(sourceIdentity(process.cwd())));
