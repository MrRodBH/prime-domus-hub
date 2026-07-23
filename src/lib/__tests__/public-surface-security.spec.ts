import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  normalizePublicEmbedUrl,
  normalizePublicMediaUrl,
  normalizePublicNavigationUrl,
} from "@/lib/public-content-security";
import { sanitizePublicHtml } from "@/lib/public-html-sanitizer.server";
import { toEmbedUrl } from "@/lib/embed-url";
import { verifyPortalDlqRetryRequest } from "@/lib/operational-route-auth.server";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`ASSERT: ${message}`);
}

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function request(authorization?: string, extra?: Record<string, string>): Request {
  const headers = new Headers(extra);
  if (authorization) headers.set("authorization", authorization);
  return new Request("https://app.example/api/public/hooks/portal-dlq-retry", {
    method: "POST",
    headers,
  });
}

export const specs: Array<{ name: string; run: () => Promise<void> }> = [
  {
    name: "administrative bootstrap surfaces are absent without replacement",
    run: async () => {
      assert(!existsSync(resolve(process.cwd(), "src/routes/api/public/bootstrap-admin.ts")), "public bootstrap route remains");
      assert(!read("src/lib/api/admin.functions.ts").includes("bootstrapAdmin"), "bootstrapAdmin server function remains");
      assert(existsSync(resolve(process.cwd(), "docs/runbooks/initial-admin-bootstrap.md")), "operator bootstrap runbook missing");
    },
  },
  {
    name: "operational DLQ authentication is dedicated and fail-closed",
    run: async () => {
      assert(!verifyPortalDlqRetryRequest(request(), undefined).ok, "missing server secret accepted");
      assert(!verifyPortalDlqRetryRequest(request(), "expected").ok, "missing Authorization accepted");
      assert(!verifyPortalDlqRetryRequest(request("Basic expected"), "expected").ok, "wrong scheme accepted");
      assert(!verifyPortalDlqRetryRequest(request("Bearer wrong"), "expected").ok, "wrong bearer accepted");
      assert(!verifyPortalDlqRetryRequest(request("Bearer expected, Bearer expected"), "expected").ok, "multiple bearer credentials accepted");
      assert(!verifyPortalDlqRetryRequest(request(undefined, { apikey: "expected" }), "expected").ok, "publishable-key header accepted");
      assert(!verifyPortalDlqRetryRequest(request(undefined, { "x-cron-secret": "expected" }), "expected").ok, "legacy cron header accepted");
      assert(verifyPortalDlqRetryRequest(request("Bearer expected"), "expected").ok, "correct dedicated bearer denied");
      const route = read("src/routes/api/public/hooks/portal-dlq-retry.ts");
      assert(route.indexOf("verifyPortalDlqRetryRequest(request)") < route.indexOf("supabaseAdmin"), "service role is imported before auth");
      assert(!route.includes("SUPABASE_PUBLISHABLE_KEY") && !route.includes("CRON_SECRET"), "legacy operational credentials remain");
    },
  },
  {
    name: "public navigation and media destinations fail closed",
    run: async () => {
      assert(normalizePublicNavigationUrl("/imoveis?x=1") === "/imoveis?x=1", "safe internal route rejected");
      assert(normalizePublicNavigationUrl("https://example.com/path")?.startsWith("https://example.com/path"), "safe HTTPS rejected");
      for (const unsafe of [
        "javascript:alert(1)", "java%73cript:alert(1)", "vbscript:x", "data:text/html,x",
        "blob:https://example.com/x", "file:///tmp/x", "//evil.example/x", "https://user:pass@example.com/x",
      ]) {
        assert(normalizePublicNavigationUrl(unsafe) === null, `unsafe navigation accepted: ${unsafe}`);
        assert(normalizePublicMediaUrl(unsafe) === null, `unsafe media accepted: ${unsafe}`);
      }
    },
  },
  {
    name: "embed providers use exact HTTPS host and path policy",
    run: async () => {
      assert(toEmbedUrl("https://youtu.be/abc_123") === "https://www.youtube.com/embed/abc_123", "YouTube conversion failed");
      assert(toEmbedUrl("https://vimeo.com/123") === "https://player.vimeo.com/video/123", "Vimeo conversion failed");
      assert(normalizePublicEmbedUrl("https://my.matterport.com/show/?m=abc") !== null, "Matterport embed rejected");
      assert(normalizePublicEmbedUrl("https://www.google.com/maps/embed?pb=x") !== null, "Google Maps embed rejected");
      for (const unsafe of [
        "http://www.youtube.com/embed/abc", "https://youtube.com.evil.test/embed/abc",
        "https://www.youtube.com/watch?v=abc", "https://unknown.example/embed/abc",
      ]) {
        assert(normalizePublicEmbedUrl(unsafe) === null, `unsafe embed accepted: ${unsafe}`);
      }
      assert(toEmbedUrl("https://unknown.example/video") === null, "raw embed fallback remains");
    },
  },
  {
    name: "server HTML sanitizer is deterministic and strips executable content",
    run: async () => {
      const dirty = `<!--x--><h2 class="x">Título</h2><script>alert(1)</script><p onclick="x()" style="color:red">Texto <a href="javascript:alert(1)" target="_blank">x</a><a href="https://example.com" target="_blank">ok</a></p><iframe src="https://evil.example"></iframe><img src="data:image/png;base64,x" onerror="x()"><ul><li>Item</li></ul>`;
      const clean = sanitizePublicHtml(dirty);
      assert(!clean.includes("script") && !clean.includes("iframe"), "executable tags remain");
      assert(!clean.includes("onclick") && !clean.includes("style=") && !clean.includes("class="), "unsafe attributes remain");
      assert(!clean.includes("javascript:") && !clean.includes("data:image"), "unsafe URL remains");
      assert(clean.includes("<h2>Título</h2>") && clean.includes("<ul><li>Item</li></ul>"), "safe editorial markup removed");
      assert(clean.includes('rel="noopener noreferrer"'), "external blank link rel normalization missing");
      assert(sanitizePublicHtml(clean) === clean, "sanitization is not idempotent");
    },
  },
  {
    name: "server-function CSRF middleware is explicit without missing-origin bypass",
    run: async () => {
      const start = read("src/start.ts");
      assert(start.includes("createCsrfMiddleware"), "CSRF middleware missing");
      assert(start.includes('ctx.handlerType === "serverFn"'), "CSRF filter is not serverFn-specific");
      assert(!start.includes("allowRequestsWithoutOriginCheck"), "missing-origin bypass present");
      assert(start.includes("errorMiddleware") && start.includes("attachSupabaseAuth") && start.includes("attachTenantHeader"), "existing middleware removed");
    },
  },
  {
    name: "persisted HTML and destination consumers receive central policy",
    run: async () => {
      const pageContract = read("src/lib/public-page-contract.ts");
      assert(pageContract.includes("sanitizePublicHtml") && pageContract.includes("normalizePublicEmbedUrl"), "CMS DTO policy missing");
      const blog = read("src/lib/api/blog.functions.ts");
      assert(blog.includes("sanitizePublicHtml") && blog.includes("normalizePublicMediaUrl"), "blog DTO policy missing");
      const launches = read("src/lib/api/lancamentos.functions.ts");
      assert(launches.includes("sanitizePublicHtml") && launches.includes("toEmbedUrl"), "launch DTO policy missing");
      const site = read("src/lib/api/site.functions.ts");
      assert(site.includes("normalizePublicEmbedUrl") && site.includes("normalizePublicNavigationUrl"), "site destination policy missing");
      const property = read("src/lib/api/catalogo.functions.ts");
      assert(property.includes("toEmbedUrl") && property.includes("normalizePublicMediaUrl"), "property destination policy missing");
    },
  },
];

export async function runPublicSurfaceSecuritySpecs(): Promise<{ passed: number; failed: number }> {
  let passed = 0;
  let failed = 0;
  for (const spec of specs) {
    try {
      await spec.run();
      passed += 1;
    } catch (error) {
      failed += 1;
      console.error(`✗ ${spec.name}\n  ${error instanceof Error ? error.message : error}`);
    }
  }
  return { passed, failed };
}
