import type { NormalizedListing } from "./types";

const MESSAGE_LIMIT = 4096;
const PHOTO_CAPTION_LIMIT = 1024;

interface TelegramTarget {
  chatId: string;
  messageThreadId?: number;
}

export function formatListingMessage(feedTitle: string, listing: NormalizedListing): string {
  const lines = [
    feedTitle,
    listing.title,
    joinDefined([listing.price, listing.priceAlt], " / "),
    listing.address,
    listing.publishedText,
    snippet(listing.description, 450),
    listing.url,
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

  if (listing.photoUrl) {
    await sendTelegramRequest(token, "sendPhoto", {
      ...telegramTargetPayload(target),
      photo: listing.photoUrl,
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
  method: "sendMessage" | "sendPhoto",
  payload: Record<string, unknown>,
): Promise<void> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram ${method} failed with ${response.status}: ${body}`);
  }
}

function joinDefined(values: Array<string | undefined>, separator: string): string | undefined {
  const filtered = values.filter((value): value is string => Boolean(value));
  return filtered.length > 0 ? filtered.join(separator) : undefined;
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
