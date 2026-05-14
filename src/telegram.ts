import type { NormalizedListing } from "./types";

const MESSAGE_LIMIT = 4096;
const PHOTO_CAPTION_LIMIT = 1024;
const FALLBACK_RATE_LIMIT_DELAY_MS = 5_000;

interface TelegramTarget {
  chatId: string;
  messageThreadId?: number;
}

export function formatListingMessage(feedTitle: string, listing: NormalizedListing): string {
  const lines = [
    feedTitle,
    listing.title,
    listing.monthlyPrice,
    listing.address,
    listing.postedDate,
    formatDetailStatus(listing),
    formatOfferType(listing.offerType),
    listing.contactPhone ? `Phone: ${listing.contactPhone}` : undefined,
    snippet(listing.fullDescription, 700),
    listing.link,
  ].filter((line): line is string => Boolean(line));

  return lines.join("\n");
}

export async function sendTelegramNotification(
  token: string,
  chatIdWithOptionalTopic: string,
  feedTitle: string,
  listing: NormalizedListing,
): Promise<void> {
  const text = formatListingMessage(feedTitle, listing);
  const target = parseTelegramTarget(chatIdWithOptionalTopic);
  const images = getListingImages(listing);

  if (images.length > 1) {
    await sendTelegramRequest(token, "sendMediaGroup", {
      ...telegramTargetPayload(target),
      media: images.slice(0, 10).map((url, index) => ({
        type: "photo",
        media: url,
        ...(index === 0 ? { caption: truncate(text, PHOTO_CAPTION_LIMIT) } : {}),
      })),
    });
    return;
  }

  if (images[0]) {
    await sendTelegramRequest(token, "sendPhoto", {
      ...telegramTargetPayload(target),
      photo: images[0],
      caption: truncate(text, PHOTO_CAPTION_LIMIT),
    });
    return;
  }

  await sendTelegramRequest(token, "sendMessage", {
    ...telegramTargetPayload(target),
    text: truncate(text, MESSAGE_LIMIT),
    disable_web_page_preview: false,
  });
}

export function parseTelegramTarget(value: string): TelegramTarget {
  const trimmed = value.trim();
  const separator = findTopicSeparator(trimmed);
  if (separator === undefined) {
    return { chatId: trimmed };
  }

  const chatId = trimmed.slice(0, separator).trim();
  const threadIdRaw = trimmed.slice(separator + 1).trim();
  const messageThreadId = Number(threadIdRaw);

  if (!chatId) {
    throw new Error("TELEGRAM_CHAT_ID must include a chat id before the topic separator");
  }

  if (!Number.isInteger(messageThreadId) || messageThreadId <= 0) {
    throw new Error("Telegram topic id must be a positive integer");
  }

  return { chatId, messageThreadId };
}

function findTopicSeparator(value: string): number | undefined {
  for (const separator of [":", "/", ","]) {
    const index = value.lastIndexOf(separator);
    if (index > 0) {
      return index;
    }
  }
  return undefined;
}

function telegramTargetPayload(target: TelegramTarget): Record<string, string | number> {
  return {
    chat_id: target.chatId,
    ...(target.messageThreadId ? { message_thread_id: target.messageThreadId } : {}),
  };
}

async function sendTelegramRequest(
  token: string,
  method: "sendMessage" | "sendPhoto" | "sendMediaGroup",
  payload: Record<string, unknown>,
): Promise<void> {
  while (true) {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return;
    }

    const body = await response.text();
    if (response.status === 429) {
      const delayMs = parseRetryAfterDelayMs(body) ?? FALLBACK_RATE_LIMIT_DELAY_MS;
      console.warn(`Telegram ${method} rate limited; retrying after ${delayMs} ms`);
      await delay(delayMs);
      continue;
    }

    throw new Error(`Telegram ${method} failed with ${response.status}: ${body}`);
  }
}

function parseRetryAfterDelayMs(body: string): number | undefined {
  const parsed = parseJsonObject(body);
  const parameters = parsed && isRecord(parsed.parameters) ? parsed.parameters : undefined;
  const retryAfter = parameters?.retry_after;

  if (typeof retryAfter !== "number" || !Number.isFinite(retryAfter) || retryAfter <= 0) {
    return undefined;
  }

  return retryAfter * 1_000;
}

function parseJsonObject(body: string): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(body);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function joinDefined(values: Array<string | undefined>, separator: string): string | undefined {
  const filtered = values.filter((value): value is string => Boolean(value));
  return filtered.length > 0 ? filtered.join(separator) : undefined;
}

function getListingImages(listing: NormalizedListing): string[] {
  const urls = new Set<string>();
  for (const url of listing.images ?? []) {
    if (url) {
      urls.add(url);
    }
  }
  return [...urls];
}

function formatOfferType(value: NormalizedListing["offerType"]): string | undefined {
  if (value === "owner") {
    return "Owner";
  }
  if (value === "agent") {
    return "Agent";
  }
  return undefined;
}

function formatDetailStatus(listing: NormalizedListing): string | undefined {
  if (listing.detailOk !== false) {
    return undefined;
  }

  const status = listing.detailStatus === null || listing.detailStatus === undefined
    ? undefined
    : `HTTP ${listing.detailStatus}`;
  const reason = joinDefined([status, listing.detailError], ", ");
  return reason ? `Details unavailable: ${reason}` : "Details unavailable";
}

function snippet(value: string | undefined, limit: number): string | undefined {
  if (!value) {
    return undefined;
  }

  return truncate(value, limit);
}

function truncate(value: string, limit: number): string {
  if (value.length <= limit) {
    return value;
  }
  return `${value.slice(0, Math.max(0, limit - 1)).trimEnd()}...`;
}
