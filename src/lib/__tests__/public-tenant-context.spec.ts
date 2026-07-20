import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  normalizePublicHost,
  parseExplicitDevelopmentHostMap,
  resolvePublicHostAuthority,
  selectExactlyOneTenant,
  type PublicTenantIdentity,
} from "@/lib/tenant.server";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERT: ${message}`);
}

function assertThrows(run: () => unknown, message: string) {
  let threw = false;
  try {
    run();
  } catch {
    threw = true;
  }
  assert(threw, message);
}

const TENANT_A: PublicTenantIdentity = {
  id: "11111111-1111-1111-1111-111111111111",
  slug: "tenant-a",
  nome: "Tenant A",
};
const TENANT_B: PublicTenantIdentity = {
  id: "22222222-2222-2222-2222-222222222222",
  slug: "tenant-b",
  nome: "Tenant B",
};

export const specs: Array<{ name: string; run: () => Promise<void> }> = [
  {
    name: "normalizes case, port and trailing dot deterministically",
    run: async () => {
      assert(normalizePublicHost(" EXAMPLE.COM.:443 ") === "example.com", "normalized domain");
      assert(normalizePublicHost("[::1]:3000") === "[::1]", "normalized IPv6 loopback");
    },
  },
  {
    name: "preserves www because aliases are explicit authorities",
    run: async () => {
      assert(normalizePublicHost("www.example.com") === "www.example.com", "www preserved");
    },
  },
  {
    name: "rejects malformed or multi-valued Host headers",
    run: async () => {
      for (const host of [
        "https://example.com",
        "example.com/path",
        "example.com,evil.test",
        "user@example.com",
        "bad host.example",
        "example.com:70000",
        "2001:db8::1",
      ]) {
        assert(normalizePublicHost(host) === null, `rejected ${host}`);
      }
    },
  },
  {
    name: "absent host fails closed",
    run: async () => {
      const a = resolvePublicHostAuthority(null, null);
      const b = resolvePublicHostAuthority("   ", null);
      assert(a.kind === "none" && a.reason === "absent_host", "null host denied");
      assert(b.kind === "none" && b.reason === "absent_host", "blank host denied");
    },
  },
  {
    name: "production host becomes exact domain authority",
    run: async () => {
      const authority = resolvePublicHostAuthority("tenant.example.com:443", null);
      assert(authority.kind === "domain", "domain authority");
      assert(authority.kind === "domain" && authority.domain === "tenant.example.com", "exact domain");
    },
  },
  {
    name: "localhost and Lovable preview fail closed without explicit mapping",
    run: async () => {
      for (const host of ["localhost:3000", "127.0.0.1:3000", "preview.lovable.app"]) {
        const authority = resolvePublicHostAuthority(host, null);
        assert(
          authority.kind === "none" && authority.reason === "unmapped_development_host",
          `${host} denied`,
        );
      }
    },
  },
  {
    name: "explicit development map resolves only a tenant slug",
    run: async () => {
      const raw = JSON.stringify({
        localhost: "tenant-a",
        "preview.lovable.app": "tenant-b",
      });
      const local = resolvePublicHostAuthority("localhost:5173", raw);
      const preview = resolvePublicHostAuthority("preview.lovable.app", raw);
      assert(local.kind === "development_slug" && local.slug === "tenant-a", "localhost slug");
      assert(preview.kind === "development_slug" && preview.slug === "tenant-b", "preview slug");
    },
  },
  {
    name: "invalid development mapping fails closed",
    run: async () => {
      assertThrows(() => parseExplicitDevelopmentHostMap("{"), "invalid JSON");
      assertThrows(() => parseExplicitDevelopmentHostMap("[]"), "array denied");
      assertThrows(
        () => parseExplicitDevelopmentHostMap(JSON.stringify({ "example.com": "tenant-a" })),
        "production mapping denied",
      );
      assertThrows(
        () => parseExplicitDevelopmentHostMap(JSON.stringify({ localhost: "Tenant A" })),
        "invalid slug denied",
      );
      assertThrows(
        () =>
          parseExplicitDevelopmentHostMap(
            JSON.stringify({ LOCALHOST: "tenant-a", "localhost:3000": "tenant-b" }),
          ),
        "duplicate normalized host denied",
      );
    },
  },
  {
    name: "tenant result cardinality is explicit",
    run: async () => {
      assert(selectExactlyOneTenant([]) === null, "zero denied");
      assert(selectExactlyOneTenant([TENANT_A])?.id === TENANT_A.id, "one accepted");
      assert(selectExactlyOneTenant([TENANT_A, TENANT_B]) === null, "ambiguous denied");
    },
  },
  {
    name: "source removes fallback and derives Host on the server",
    run: async () => {
      const source = readFileSync(resolve(process.cwd(), "src/lib/tenant.server.ts"), "utf8");
      const authoritySection = source.slice(0, source.indexOf("export function publicSupabaseForTenant"));
      assert(!source.includes("FALLBACK_TENANT_SLUG"), "no fallback constant");
      assert(!source.includes('"rm-prime"'), "no default tenant slug");
      assert(source.includes('getRequestHeader("host")'), "request Host is server-derived");
      assert(authoritySection.includes('.limit(2)'), "cardinality reads at most two rows");
      assert(!authoritySection.includes("maybeSingle"), "no maybeSingle ambiguity collapse");
      assert(!authoritySection.includes('"x-tenant-id"'), "header is not authority");
    },
  },
];

export async function runPublicTenantContextSpecs(): Promise<{
  passed: number;
  failed: number;
}> {
  let passed = 0;
  let failed = 0;
  for (const spec of specs) {
    try {
      await spec.run();
      passed++;
    } catch (error) {
      failed++;
      console.error(`✗ ${spec.name}\n  ${error instanceof Error ? error.message : error}`);
    }
  }
  return { passed, failed };
}
