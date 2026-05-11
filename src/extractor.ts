import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeExtractedListing } from "./listing";
import type { ExtractedFeed, ExtractedListing, FeedConfig, NormalizedListing } from "./types";

const DEFAULT_SCHEMA_PATH = fileURLToPath(
  new URL("../schemas/housekg-listings.schema.json", import.meta.url),
);

export interface ExtractorOptions {
  schemaPath?: string;
  binary?: string;
}

export async function extractFeedListings(
  feed: FeedConfig,
  options: ExtractorOptions = {},
): Promise<NormalizedListing[]> {
  const extracted = await runExtractor(feed, options);
  return extracted.items
    .map((item) => normalizeExtractedListing(item))
    .filter((item): item is NormalizedListing => Boolean(item));
}

export async function runExtractor(
  feed: FeedConfig,
  options: ExtractorOptions = {},
): Promise<ExtractedFeed> {
  const binary = resolveExtractorBinary(options.binary);
  const schemaPath = options.schemaPath ?? DEFAULT_SCHEMA_PATH;
  const proc = Bun.spawn([binary, "parse", "--url", feed.url, "--schema", schemaPath], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (exitCode !== 0) {
    throw new Error(`Extractor exited with code ${exitCode}: ${stderr.trim() || stdout.trim()}`);
  }

  return parseExtractorOutput(stdout, feed.title);
}

function resolveExtractorBinary(option: string | undefined): string {
  if (option) {
    return option;
  }

  if (process.env.YO_URL_YO_JSON_BIN?.trim()) {
    return process.env.YO_URL_YO_JSON_BIN.trim();
  }

  const localBinary = join(process.cwd(), "node_modules", ".bin", "yo-url-yo-json");
  return existsSync(localBinary) ? localBinary : "yo-url-yo-json";
}

export function parseExtractorOutput(stdout: string, fallbackFeedTitle = "House.kg feed"): ExtractedFeed {
  const parsed = parseJson(stdout);

  if (!isRecord(parsed) || !Array.isArray(parsed.items)) {
    throw new Error("Extractor output must include items[]");
  }

  return {
    feedTitle: stringValue(parsed.feedTitle) ?? fallbackFeedTitle,
    items: parsed.items.map((item, index) => {
      if (!isRecord(item)) {
        throw new Error(`Extractor item at index ${index} must be an object`);
      }

      return extractedListingFromRecord(item);
    }),
  };
}

function extractedListingFromRecord(item: Record<string, unknown>): ExtractedListing {
  const listing: ExtractedListing = {};
  assignString(listing, "id", item.id);
  assignString(listing, "link", item.link);
  assignString(listing, "title", item.title);
  assignString(listing, "address", item.address);
  assignString(listing, "monthlyPrice", item.monthlyPrice);
  assignString(listing, "fullDescription", item.fullDescription);
  assignString(listing, "postedDate", item.postedDate);
  assignString(listing, "contactPhone", item.contactPhone);
  assignString(listing, "detailError", item.detailError);

  const images = stringArrayValue(item.images);
  if (images) {
    listing.images = images;
  }

  if (item.offerType === "agent" || item.offerType === "owner") {
    listing.offerType = item.offerType;
  }

  if (typeof item.detailStatus === "number" || item.detailStatus === null) {
    listing.detailStatus = item.detailStatus;
  }

  if (typeof item.detailOk === "boolean") {
    listing.detailOk = item.detailOk;
  }

  return listing;
}

function assignString<Key extends keyof ExtractedListing>(
  listing: ExtractedListing,
  field: Key,
  value: unknown,
): void {
  const string = stringValue(value);
  if (string !== undefined) {
    (listing[field] as string | undefined) = string;
  }
}

function parseJson(stdout: string): unknown {
  const trimmed = stdout.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Extractor did not return valid JSON");
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function stringArrayValue(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const values = value.filter((item): item is string => typeof item === "string");
  return values.length > 0 ? values : undefined;
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
