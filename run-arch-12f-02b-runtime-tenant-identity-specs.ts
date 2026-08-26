import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { getRequiredEmailIdentityConfig } from "./src/lib/runtime/email-identity-config.server";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(`${ROOT}/${path}`, "utf8");

const validEnvironment = {
  RM_PRIME_EMAIL_SITE_NAME: "RM Prime CI",
  RM_PRIME_EMAIL_SENDER_DOMAIN: "mail.ci.example.test",
  RM_PRIME_EMAIL_FROM_DOMAIN: "ci.example.test",
  RM_PRIME_AUTH_SITE_ORIGIN: "https://ci.example.test",
} as const;

const resolved = getRequiredEmailIdentityConfig(validEnvironment);
assert.deepEqual(resolved, {
  siteName: "RM Prime CI",
  senderDomain: "mail.ci.example.test",
  fromDomain: "ci.example.test",
  authSiteOrigin: "https://ci.example.test",
  from: "RM Prime CI <noreply@ci.example.test>",
});

for (const [name, environment] of Object.entries({
  missing: {},
  sender_root: { ...validEnvironment, RM_PRIME_EMAIL_SENDER_DOMAIN: "ci.example.test" },
  sender_cross_domain: { ...validEnvironment, RM_PRIME_EMAIL_SENDER_DOMAIN: "mail.other.test" },
  origin_http: { ...validEnvironment, RM_PRIME_AUTH_SITE_ORIGIN: "http://ci.example.test" },
  origin_path: { ...validEnvironment, RM_PRIME_AUTH_SITE_ORIGIN: "https://ci.example.test/path" },
  header_injection: {
    ...validEnvironment,
    RM_PRIME_EMAIL_SITE_NAME: "RM Prime\nBcc: victim@example.test",
  },
})) {
  assert.throws(
    () => getRequiredEmailIdentityConfig(environment),
    undefined,
    `${name} must fail closed`,
  );
}

const runtimePaths = [
  "src/lib/email/notify.server.ts",
  "src/routes/lovable/email/auth/preview.ts",
  "src/routes/lovable/email/auth/webhook.ts",
  "src/routes/lovable/email/transactional/send.ts",
  "src/routes/sitemap[.]xml.ts",
  "src/routes/sobre.tsx",
  "src/routes/contato.tsx",
  "src/routes/anuncie.tsx",
  "src/routes/privacidade.tsx",
  "src/routes/lancamentos.$slug.tsx",
];
for (const path of runtimePaths) {
  const source = read(path);
  assert.doesNotMatch(
    source,
    /rmprimeimoveis\.com\.br|contato\.rmprimeimoveis|prime-domus-hub\.lovable\.app|Prime Property Hub/,
  );
}

for (const path of [
  "src/lib/email/notify.server.ts",
  "src/routes/lovable/email/auth/preview.ts",
  "src/routes/lovable/email/auth/webhook.ts",
  "src/routes/lovable/email/transactional/send.ts",
]) {
  assert.match(read(path), /getRequiredEmailIdentityConfig/);
}

const tenantSource = read("src/lib/tenant.server.ts");
assert.match(tenantSource, /requireAuthoritativePublicOriginFromRequest/);
assert.match(tenantSource, /Partial<ActivePublicDomainIdentity>.*canonicalHostname/s);
assert.doesNotMatch(tenantSource, /x-forwarded-host|x-forwarded-proto/i);

const sitemapSource = read("src/routes/sitemap[.]xml.ts");
assert.match(sitemapSource, /requireAuthoritativePublicOriginFromRequest/);
assert.doesNotMatch(sitemapSource, /const BASE_URL|rmprimeimoveis/);

for (const path of ["sobre", "contato", "anuncie", "privacidade"]) {
  const source = read(`src/routes/${path}.tsx`);
  assert.match(source, new RegExp(`rel: ["']canonical["'], href: ["']/${path}["']`));
  assert.doesNotMatch(source, /property: ["']og:url["']/);
}

const base = process.env.ARCH_12F_02B_BASE_SHA?.trim();
if (base) {
  assert.match(base, /^[0-9a-f]{40}$/);
  const changed = execFileSync("git", ["diff", "--name-only", `${base}..HEAD`], {
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter(Boolean);
  assert.ok(changed.length > 0, "focused diff must not be empty");
  assert.equal(changed.filter((path) => path.startsWith("supabase/migrations/")).length, 0);
  const allowed = new Set([
    ".env.example",
    ".github/workflows/release-gate.yml",
    "docs/architecture/governance/RM_PRIME_SAFE_CHAT_MIGRATION_2026-08-25.md",
    "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/arch-12f-02b-runtime-tenant-domain-sender-externalization.md",
    "package.json",
    "run-arch-12f-02b-runtime-tenant-identity-specs.ts",
    "src/lib/email-templates/definir-senha.tsx",
    "src/lib/email/notify.server.ts",
    "src/lib/runtime/email-identity-config.server.ts",
    "src/lib/tenant.server.ts",
    "src/routes/anuncie.tsx",
    "src/routes/contato.tsx",
    "src/routes/lancamentos.$slug.tsx",
    "src/routes/lovable/email/auth/preview.ts",
    "src/routes/lovable/email/auth/webhook.ts",
    "src/routes/lovable/email/transactional/send.ts",
    "src/routes/privacidade.tsx",
    "src/routes/sitemap[.]xml.ts",
    "src/routes/sobre.tsx",
  ]);
  assert.deepEqual(
    changed.filter((path) => !allowed.has(path)),
    [],
    "diff exceeded ARCH-12F-02B allowlist",
  );
}

console.log("ARCH-12F-02B runtime tenant identity specifications: PASS");
