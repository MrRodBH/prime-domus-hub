import { createHash } from "node:crypto";
import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

// Version this scope when changing its coverage. No environment values or secrets.
export const sourceScope = "rm-prime-source-v1";
const roots = ["src", "public", "scripts"];
const required = ["package.json", "bun.lock", "tsconfig.json", "vite.config.ts"];
const excluded = new Set(["src/routeTree.gen.ts", "public/release.json"]);
export function sourceIdentity(root: string) {
  const files: string[] = [];
  function visit(path: string) {
    if (excluded.has(path)) return;
    const stat = lstatSync(join(root, path));
    if (stat.isSymbolicLink()) throw new Error("Release identity does not accept source symlinks");
    if (stat.isDirectory()) {
      for (const name of readdirSync(join(root, path)).sort()) visit(`${path}/${name}`);
    } else if (stat.isFile()) files.push(path);
    else throw new Error("Unsupported release source entry");
  }
  for (const path of [...roots, ...required]) visit(path);
  // Optional alternative build configuration/lockfiles are included when present.
  for (const path of ["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb", "postcss.config.js", "tailwind.config.ts", "index.html"])
    if (existsSync(join(root, path))) visit(path);
  const entries = files.sort().map(path => [path, createHash("sha256").update(readFileSync(join(root, path))).digest("hex")]);
  return { scope: sourceScope, algorithm: "sha256", sha256: createHash("sha256").update(JSON.stringify([sourceScope, entries])).digest("hex"), fileCount: entries.length };
}

export function releaseIdentity(root: string) {
  let commit: string | null = null;
  let dirty: boolean | null = null;
  try {
    // Reject a parent repository: an exported build can live inside another checkout.
    const prefix = execFileSync("git", ["rev-parse", "--show-prefix"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    if (prefix) throw new Error("Not a repository root");
    const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    if (!/^[a-f0-9]{40,64}$/.test(sha)) throw new Error("Invalid Git revision");
    const status = execFileSync("git", ["status", "--porcelain", "--untracked-files=normal"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    commit = sha;
    dirty = status.trim().length > 0;
  } catch { /* Missing Git metadata is unknown, never clean or a fabricated SHA. */ }
  return { schemaVersion: 2, commit, dirty, source: sourceIdentity(root), builtAt: new Date().toISOString() };
}
