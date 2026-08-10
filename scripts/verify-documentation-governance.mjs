#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

function fail(message, details = {}) {
  const evidence = {
    ok: false,
    error: message,
    ...details,
  };
  writeFileSync('documentation-governance-evidence.json', `${JSON.stringify(evidence, null, 2)}\n`);
  console.error(message);
  process.exit(1);
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1 || index + 1 >= process.argv.length) return undefined;
  return process.argv[index + 1];
}

function git(args, options = {}) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  }).trim();
}

const base = argValue('--base') ?? process.env.DOCS_GATE_BASE_SHA;
const head = argValue('--head') ?? process.env.DOCS_GATE_HEAD_SHA;
const shaPattern = /^[0-9a-f]{40}$/;

if (!base || !shaPattern.test(base)) fail(`Invalid --base SHA: ${base ?? '<missing>'}`);
if (!head || !shaPattern.test(head)) fail(`Invalid --head SHA: ${head ?? '<missing>'}`);

try {
  git(['cat-file', '-e', `${base}^{commit}`]);
  git(['cat-file', '-e', `${head}^{commit}`]);
} catch {
  fail('Base/head commit object is unavailable', { base, head });
}

const checkedOutHead = git(['rev-parse', 'HEAD']);
if (checkedOutHead !== head) {
  fail('Documentation gate is not running on the exact head', { base, head, checkedOutHead });
}

const ancestry = spawnSync('git', ['merge-base', '--is-ancestor', base, head], { encoding: 'utf8' });
if (ancestry.status !== 0) {
  fail('Head is not a descendant of base', { base, head, checkedOutHead });
}

const changedOutput = execFileSync('git', ['diff', '--name-only', '-z', `${base}..${head}`], {
  encoding: 'utf8',
});
const changedFiles = changedOutput.split('\0').filter(Boolean);

if (changedFiles.length === 0) {
  fail('Documentation gate requires a non-empty diff', { base, head, checkedOutHead, changedFiles });
}

const nonDocsFiles = changedFiles.filter((path) => !path.startsWith('docs/'));
if (nonDocsFiles.length > 0) {
  fail('Documentation gate received a technical/non-doc diff', {
    base,
    head,
    checkedOutHead,
    changedFiles,
    nonDocsFiles,
  });
}

const diffCheck = spawnSync('git', ['diff', '--check', `${base}..${head}`], { encoding: 'utf8' });
const diffCheckPassed = diffCheck.status === 0;
if (!diffCheckPassed) {
  fail('git diff --check failed for documentation diff', {
    base,
    head,
    checkedOutHead,
    changedFiles,
    diffCheckPassed,
    diffCheckOutput: `${diffCheck.stdout ?? ''}${diffCheck.stderr ?? ''}`.trim(),
  });
}

const markdownFiles = changedFiles.filter((path) => path.endsWith('.md') && existsSync(path));
const validatedMarkdown = [];

for (const path of markdownFiles) {
  const text = readFileSync(path, 'utf8');
  const lines = text.split(/\r?\n/);

  const conflictLines = [];
  let openFence = null;

  lines.forEach((line, index) => {
    if (/^\s*(<<<<<<<\s|>>>>>>>\s)/.test(line)) {
      conflictLines.push(index + 1);
    }

    const fence = line.match(/^\s*(`{3,}|~{3,})/);
    if (!fence) return;

    const marker = fence[1];
    const kind = marker[0];
    const length = marker.length;

    if (openFence === null) {
      openFence = { kind, length, line: index + 1 };
      return;
    }

    if (kind === openFence.kind && length >= openFence.length) {
      openFence = null;
    }
  });

  if (conflictLines.length > 0) {
    fail(`Unresolved merge-conflict marker found in ${path}`, {
      base,
      head,
      checkedOutHead,
      changedFiles,
      path,
      conflictLines,
    });
  }

  if (openFence !== null) {
    fail(`Unbalanced Markdown fence found in ${path}`, {
      base,
      head,
      checkedOutHead,
      changedFiles,
      path,
      openFence,
    });
  }

  validatedMarkdown.push(path);
}

const evidence = {
  ok: true,
  mode: 'docs-only',
  base,
  head,
  checkedOutHead,
  docsOnly: true,
  changedFileCount: changedFiles.length,
  changedFiles,
  diffCheckPassed: true,
  conflictMarkersPassed: true,
  markdownFencesPassed: true,
  markdownFilesValidated: validatedMarkdown,
  productionBuildExecuted: false,
  workerdExecuted: false,
  wranglerDryRunExecuted: false,
};

writeFileSync('documentation-governance-evidence.json', `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify(evidence, null, 2));
