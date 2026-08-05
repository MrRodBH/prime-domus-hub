// Public Suffix List snapshot from https://publicsuffix.org/list/public_suffix_list.dat
// VERSION: 2026-07-25_14-20-03_UTC; COMMIT: e1b8015c3b2f0f4f8c18659c2480fc1a22c07b20
// Embedded to keep hostname authority deterministic, offline and Cloudflare-runtime compatible.
import { DomainError } from "./domain-errors";
import { PUBLIC_SUFFIX_RULES_01 } from "./public-suffix-snapshot/part-01";
import { PUBLIC_SUFFIX_RULES_02 } from "./public-suffix-snapshot/part-02";
import { PUBLIC_SUFFIX_RULES_03 } from "./public-suffix-snapshot/part-03";
import { PUBLIC_SUFFIX_RULES_04 } from "./public-suffix-snapshot/part-04";
import { PUBLIC_SUFFIX_RULES_05 } from "./public-suffix-snapshot/part-05";
import { PUBLIC_SUFFIX_RULES_06 } from "./public-suffix-snapshot/part-06";
import { PUBLIC_SUFFIX_RULES_07 } from "./public-suffix-snapshot/part-07";
import { PUBLIC_SUFFIX_RULES_08 } from "./public-suffix-snapshot/part-08";

export interface NormalizedDomainName {
  hostname: string;
  registrableDomain: string;
  publicSuffix: string;
}

const PUBLIC_SUFFIX_RULES = new Set([
  ...PUBLIC_SUFFIX_RULES_01,
  ...PUBLIC_SUFFIX_RULES_02,
  ...PUBLIC_SUFFIX_RULES_03,
  ...PUBLIC_SUFFIX_RULES_04,
  ...PUBLIC_SUFFIX_RULES_05,
  ...PUBLIC_SUFFIX_RULES_06,
  ...PUBLIC_SUFFIX_RULES_07,
  ...PUBLIC_SUFFIX_RULES_08,
]);
const DOMAIN_LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const RESERVED_EXACT = new Set([
  "localhost", "local", "internal", "invalid", "example", "test",
  "example.com", "example.net", "example.org",
]);
const RESERVED_SUFFIXES = [".localhost", ".local", ".internal", ".invalid", ".test", ".example"];

function toAsciiHostname(input: string): string {
  try {
    const url = new URL(`http://${input}`);
    if (url.username || url.password || url.port || url.pathname !== "/" || url.search || url.hash) {
      throw new Error("url-shaped input");
    }
    return url.hostname.toLowerCase();
  } catch (error) {
    throw new DomainError("domain_invalid_hostname", "Hostname is not valid IDNA input", { cause: error });
  }
}

function validIpv4(hostname: string): boolean {
  if (!IPV4_RE.test(hostname)) return false;
  return hostname.split(".").every((part) => Number(part) >= 0 && Number(part) <= 255);
}

function matchingPublicSuffix(labels: readonly string[]): string {
  // PSL algorithm: the prevailing rule is the longest exact or wildcard match.
  // A wildcard consumes the concrete left-most label (for example, *.ck makes
  // a.ck itself a public suffix). Exception rules remove exactly their first label.
  let prevailingLength = 1; // implicit "*" rule

  for (let index = 0; index < labels.length; index += 1) {
    const concreteSuffixLabels = labels.slice(index);
    const concreteSuffix = concreteSuffixLabels.join(".");
    const exceptionRule = `!${concreteSuffix}`;
    if (PUBLIC_SUFFIX_RULES.has(exceptionRule)) {
      return concreteSuffixLabels.slice(1).join(".");
    }

    const concreteLength = concreteSuffixLabels.length;
    if (PUBLIC_SUFFIX_RULES.has(concreteSuffix) && concreteLength > prevailingLength) {
      prevailingLength = concreteLength;
    }

    if (index + 1 < labels.length) {
      const wildcardRule = `*.${labels.slice(index + 1).join(".")}`;
      if (PUBLIC_SUFFIX_RULES.has(wildcardRule) && concreteLength > prevailingLength) {
        // Return the concrete suffix, not the textual wildcard base.
        prevailingLength = concreteLength;
      }
    }
  }

  return labels.slice(-prevailingLength).join(".");
}

export function normalizeDomainHostname(input: string): NormalizedDomainName {
  if (typeof input !== "string") throw new DomainError("domain_invalid_hostname", "Hostname must be a string");
  const trimmed = input.trim().toLowerCase();
  if (!trimmed || trimmed.length > 254) throw new DomainError("domain_invalid_hostname", "Hostname is empty or too long");
  if (/[:/\\?#@\s]/.test(trimmed) || trimmed.includes("://")) {
    throw new DomainError("domain_invalid_hostname", "Only a hostname is accepted");
  }
  if (trimmed.startsWith("*.") || trimmed.includes("*")) {
    throw new DomainError("domain_invalid_hostname", "Wildcard hostnames are prohibited");
  }
  const withoutDot = trimmed.endsWith(".") ? trimmed.slice(0, -1) : trimmed;
  if (!withoutDot || withoutDot.endsWith(".")) {
    throw new DomainError("domain_invalid_hostname", "At most one terminal dot is allowed");
  }

  const hostname = toAsciiHostname(withoutDot);
  if (hostname.length > 253 || hostname.includes(":")) {
    throw new DomainError("domain_invalid_hostname", "Hostname exceeds DNS limits or is an IP literal");
  }
  if (validIpv4(hostname) || hostname.startsWith("[") || hostname.endsWith("]")) {
    throw new DomainError("domain_invalid_hostname", "IP literals are prohibited");
  }
  if (RESERVED_EXACT.has(hostname) || RESERVED_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    throw new DomainError("domain_reserved_hostname", "Reserved, example, test and internal hostnames are prohibited");
  }

  const labels = hostname.split(".");
  if (labels.length < 2 || labels.some((label) => !DOMAIN_LABEL_RE.test(label))) {
    throw new DomainError("domain_invalid_hostname", "Hostname labels are invalid");
  }
  const publicSuffix = matchingPublicSuffix(labels);
  const suffixLabels = publicSuffix.split(".").filter(Boolean);
  if (!publicSuffix || labels.length <= suffixLabels.length) {
    throw new DomainError("domain_public_suffix_only", "A public suffix cannot be activated directly");
  }
  const registrableDomain = labels.slice(-(suffixLabels.length + 1)).join(".");
  return { hostname, registrableDomain, publicSuffix };
}

export function isProductionDomainHostname(input: string): boolean {
  try {
    normalizeDomainHostname(input);
    return true;
  } catch {
    return false;
  }
}

export const PUBLIC_SUFFIX_SNAPSHOT = Object.freeze({
  version: "2026-07-25_14-20-03_UTC",
  commit: "e1b8015c3b2f0f4f8c18659c2480fc1a22c07b20",
  ruleCount: PUBLIC_SUFFIX_RULES.size,
});
