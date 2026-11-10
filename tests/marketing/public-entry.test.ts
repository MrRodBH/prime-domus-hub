import { describe, expect, it } from "vitest";
import { shouldRedirectToPlatformAccess, loadRequiredPublicRootDataForPath } from "../../src/lib/public-tenant-read-guards";

describe("unbound preview entry", () => {
  it("routes only the unbound development homepage to platform access", () => {
    expect(shouldRedirectToPlatformAccess("/", "unmapped_development_host")).toBe(true);
  });
  it("does not redirect a resolved company homepage", () => {
    expect(shouldRedirectToPlatformAccess("/", null)).toBe(false);
  });
  it("keeps invalid, absent and unmapped Workers hosts fail-closed", () => {
    for (const reason of ["absent_host", "invalid_host", "unmapped_preview_host"]) {
      expect(shouldRedirectToPlatformAccess("/", reason)).toBe(false);
    }
  });
  it("does not reroute company content or authenticated navigation", () => {
    for (const path of ["/imoveis", "/p/oferta", "/lp/oferta", "/rmprime/admin", "/super", "/auth"]) {
      expect(shouldRedirectToPlatformAccess(path, "unmapped_development_host")).toBe(false);
    }
  });
  it("platform access loads no public company settings or tracking", async () => {
    let reads = 0;
    const load = async () => { reads++; return {}; };
    expect(await loadRequiredPublicRootDataForPath("/auth", load, load)).toBeNull();
    expect(reads).toBe(0);
  });
});