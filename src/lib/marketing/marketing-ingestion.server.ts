import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import * as XLSX from "xlsx";
import {
  MarketingAttributionSchema,
  MarketingFieldMappingSchema,
  getMarketingChannelDefinition,
  type MarketingAttribution,
  type MarketingChannelKey,
  type MarketingFieldMapping,
  type MarketingManualMethod,
} from "@/lib/marketing/marketing-channel-registry";

export type MarketingRawRow = Record<string, unknown>;

export type MappedMarketingLead = {
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  propertyReference: string | null;
  source: string | null;
  attribution: MarketingAttribution;
  normalizedEmail: string | null;
  normalizedPhone: string | null;
};

const MAX_ROWS = 5_000;
const MAX_COLUMNS = 64;
const MAX_VALUE_LENGTH = 4_000;
const REDACTED_KEYS = [
  "secret",
  "token",
  "password",
  "authorization",
  "api_key",
  "apikey",
  "client_secret",
  "access_token",
  "refresh_token",
  "app_secret",
];

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, canonical(child)]),
  );
}

export function stableMarketingJson(value: unknown): string {
  return JSON.stringify(canonical(value));
}

export function hashMarketingPayload(value: unknown): string {
  return createHash("sha256").update(stableMarketingJson(value)).digest("hex");
}

export function deterministicMarketingPayloadId(value: unknown): string {
  return `sha256:${hashMarketingPayload(value)}`;
}

export function verifyMarketingHmacSha256(input: {
  rawBody: string;
  signatureHex: string;
  timestampSeconds: number;
  nowSeconds: number;
  maxSkewSeconds: number;
  secret: string;
}): boolean {
  if (!Number.isInteger(input.timestampSeconds) || !Number.isInteger(input.nowSeconds)) return false;
  if (!Number.isInteger(input.maxSkewSeconds) || input.maxSkewSeconds < 1) return false;
  if (Math.abs(input.nowSeconds - input.timestampSeconds) > input.maxSkewSeconds) return false;
  if (!/^[0-9a-f]{64}$/i.test(input.signatureHex) || input.secret.length < 16) return false;
  const expected = createHmac("sha256", input.secret)
    .update(`${input.timestampSeconds}.${input.rawBody}`)
    .digest();
  const received = Buffer.from(input.signatureHex, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function sanitizeMarketingPayload(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[depth_limit]";
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitizeMarketingPayload(item, depth + 1));
  if (!value || typeof value !== "object") {
    if (typeof value === "string") return value.slice(0, MAX_VALUE_LENGTH);
    return value;
  }
  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>).slice(0, MAX_COLUMNS)) {
    if (REDACTED_KEYS.some((token) => key.toLowerCase().includes(token))) {
      output[key] = "[redacted]";
    } else {
      output[key] = sanitizeMarketingPayload(child, depth + 1);
    }
  }
  return output;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += character;
    }
  }
  if (quoted) throw new Error("marketing_csv_unclosed_quote");
  values.push(current);
  return values;
}

function rejectSpreadsheetFormula(value: unknown): void {
  if (typeof value !== "string") return;
  const trimmed = value.trimStart();
  if (/^[=+@]/.test(trimmed) || /^-[A-Za-z_(]/.test(trimmed)) {
    throw new Error("marketing_spreadsheet_formula_prohibited");
  }
}

function normalizeRows(rows: MarketingRawRow[]): MarketingRawRow[] {
  if (rows.length === 0) throw new Error("marketing_import_empty");
  if (rows.length > MAX_ROWS) throw new Error("marketing_import_row_limit_exceeded");
  return rows.map((row, rowIndex) => {
    const entries = Object.entries(row);
    if (entries.length === 0 || entries.length > MAX_COLUMNS) {
      throw new Error(`marketing_import_column_limit:${rowIndex + 1}`);
    }
    const normalized: MarketingRawRow = {};
    for (const [rawKey, rawValue] of entries) {
      const key = rawKey.trim();
      if (!key || key.length > 120) throw new Error(`marketing_import_header_invalid:${rowIndex + 1}`);
      rejectSpreadsheetFormula(rawValue);
      if (typeof rawValue === "string" && rawValue.length > MAX_VALUE_LENGTH) {
        throw new Error(`marketing_import_value_too_long:${rowIndex + 1}:${key}`);
      }
      normalized[key] = rawValue;
    }
    return normalized;
  });
}

export function parseMarketingManualImport(input: {
  format: MarketingManualMethod;
  contentBase64: string;
}): MarketingRawRow[] {
  const bytes = Buffer.from(input.contentBase64, "base64");
  if (bytes.length === 0 || bytes.length > 6_000_000) throw new Error("marketing_import_file_size_invalid");

  if (input.format === "CSV" || input.format === "MANUAL_ROW") {
    const text = bytes.toString("utf8").replace(/^\uFEFF/, "");
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) throw new Error("marketing_import_csv_rows_required");
    const headers = parseCsvLine(lines[0]).map((header) => header.trim());
    if (new Set(headers).size !== headers.length || headers.some((header) => !header)) {
      throw new Error("marketing_import_header_duplicate_or_blank");
    }
    const rows = lines.slice(1).map((line, rowIndex) => {
      const values = parseCsvLine(line);
      if (values.length !== headers.length) throw new Error(`marketing_import_column_mismatch:${rowIndex + 2}`);
      return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
    });
    return normalizeRows(rows);
  }

  const workbook = XLSX.read(bytes, { type: "buffer", cellFormula: true, cellText: false, cellDates: false });
  if (workbook.SheetNames.length !== 1) throw new Error("marketing_import_single_sheet_required");
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  for (const [address, cell] of Object.entries(sheet)) {
    if (address.startsWith("!")) continue;
    if ((cell as XLSX.CellObject).f) throw new Error(`marketing_spreadsheet_formula_prohibited:${address}`);
  }
  const rows = XLSX.utils.sheet_to_json<MarketingRawRow>(sheet, { defval: null, raw: false });
  return normalizeRows(rows);
}

function readPath(row: MarketingRawRow, path: string | null): unknown {
  if (!path) return null;
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[segment];
  }, row);
}

function boundedString(value: unknown, maxLength: number): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (text.length > maxLength) throw new Error("marketing_mapped_value_too_long");
  return text;
}

export function normalizeMarketingEmail(value: unknown): string | null {
  const text = boundedString(value, 254);
  if (!text) return null;
  const normalized = text.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error("marketing_email_invalid");
  return normalized;
}

export function normalizeMarketingPhone(value: unknown): string | null {
  const text = boundedString(value, 80);
  if (!text) return null;
  const normalized = text.replace(/[^0-9]+/g, "");
  if (normalized.length < 8 || normalized.length > 20) throw new Error("marketing_phone_invalid");
  return normalized;
}

export function mapMarketingLead(input: {
  row: MarketingRawRow;
  mapping: MarketingFieldMapping;
  channelKey: MarketingChannelKey;
  connectorId: string;
  mappingVersion: number;
  receivedAt: string;
}): MappedMarketingLead {
  const mapping = MarketingFieldMappingSchema.parse(input.mapping);
  const channel = getMarketingChannelDefinition(input.channelKey);
  const name = boundedString(readPath(input.row, mapping.name), 200);
  if (!name || name.length < 2) throw new Error("marketing_name_invalid");
  const email = normalizeMarketingEmail(readPath(input.row, mapping.email));
  const phone = normalizeMarketingPhone(readPath(input.row, mapping.phone));
  if (!email && !phone) throw new Error("marketing_contact_required");

  const providerPayloadId = boundedString(readPath(input.row, mapping.provider_payload_id), 300)
    ?? deterministicMarketingPayloadId(input.row);
  const attribution = MarketingAttributionSchema.parse({
    channel: input.channelKey,
    provider: channel.providerKey,
    source: boundedString(readPath(input.row, mapping.source), 200),
    campaignId: boundedString(readPath(input.row, mapping.campaign_id), 200),
    campaignName: boundedString(readPath(input.row, mapping.campaign_name), 300),
    adsetId: boundedString(readPath(input.row, mapping.adset_id), 200),
    adsetName: boundedString(readPath(input.row, mapping.adset_name), 300),
    adId: boundedString(readPath(input.row, mapping.ad_id), 200),
    adName: boundedString(readPath(input.row, mapping.ad_name), 300),
    utmSource: boundedString(readPath(input.row, mapping.utm_source), 300),
    utmMedium: boundedString(readPath(input.row, mapping.utm_medium), 300),
    utmCampaign: boundedString(readPath(input.row, mapping.utm_campaign), 300),
    utmContent: boundedString(readPath(input.row, mapping.utm_content), 500),
    utmTerm: boundedString(readPath(input.row, mapping.utm_term), 500),
    gclid: boundedString(readPath(input.row, mapping.gclid), 500),
    fbclid: boundedString(readPath(input.row, mapping.fbclid), 500),
    landingUrl: boundedString(readPath(input.row, mapping.landing_url), 2000),
    referrer: boundedString(readPath(input.row, mapping.referrer), 2000),
    providerPayloadId,
    connectorId: input.connectorId,
    mappingVersion: input.mappingVersion,
    receivedAt: input.receivedAt,
  });

  return {
    name,
    email,
    phone: boundedString(readPath(input.row, mapping.phone), 80),
    message: boundedString(readPath(input.row, mapping.message), 4_000),
    propertyReference: boundedString(readPath(input.row, mapping.property_reference), 200),
    source: attribution.source ?? input.channelKey.toLowerCase(),
    attribution,
    normalizedEmail: email,
    normalizedPhone: phone,
  };
}
