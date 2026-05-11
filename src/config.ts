import { readFileSync } from "node:fs";
import type { FeedConfig } from "./types";

export function loadFeedsConfig(configPath: string): FeedConfig[] {
  const raw = readFileSync(configPath, "utf8");
  return parseFeedsConfig(JSON.parse(raw));
}

export function parseFeedsConfig(input: unknown): FeedConfig[] {
  const feedsInput = Array.isArray(input)
    ? input
    : isRecord(input) && Array.isArray(input.feeds)
      ? input.feeds
      : undefined;

  if (!feedsInput) {
    throw new Error("Feed config must be an array or an object with a feeds array");
  }

  const seenIds = new Set<string>();
  const feeds = feedsInput.map((feed, index) => parseFeed(feed, index));

  for (const feed of feeds) {
    if (seenIds.has(feed.id)) {
      throw new Error(`Duplicate feed id "${feed.id}"`);
    }
    seenIds.add(feed.id);
  }

  return feeds;
}

function parseFeed(input: unknown, index: number): FeedConfig {
  if (!isRecord(input)) {
    throw new Error(`Feed at index ${index} must be an object`);
  }

  const id = requiredString(input.id, `feeds[${index}].id`);
  const title = requiredString(input.title, `feeds[${index}].title`);
  const url = requiredString(input.url, `feeds[${index}].url`);

  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error(`feeds[${index}].id must contain only letters, numbers, "_" or "-"`);
  }

  assertHttpUrl(url, `feeds[${index}].url`);

  if (typeof input.enabled !== "boolean") {
    throw new Error(`feeds[${index}].enabled must be a boolean`);
  }

  return { id, title, url, enabled: input.enabled };
}

function requiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
  return value.trim();
}

function assertHttpUrl(value: string, fieldName: string): void {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${fieldName} must be a valid absolute URL`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${fieldName} must use http or https`);
  }
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
