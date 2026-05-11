import { expect, test } from "bun:test";
import { formatListingMessage, parseTelegramTarget, sendTelegramNotification } from "../src/telegram";

test("formats Telegram listing messages with useful fields", () => {
  const message = formatListingMessage("Bishkek apartments", {
    id: "123",
    url: "https://www.house.kg/details/123",
    title: "2-room apartment",
    price: "$500",
    priceAlt: "44 000 KGS",
    address: "Bishkek, Toktogul",
    description: "Fresh repair and furniture.",
    publishedText: "Today",
  });

  expect(message).toContain("Bishkek apartments");
  expect(message).toContain("2-room apartment");
  expect(message).toContain("$500 / 44 000 KGS");
  expect(message).toContain("Bishkek, Toktogul");
  expect(message).toContain("Fresh repair and furniture.");
  expect(message).toContain("https://www.house.kg/details/123");
});

test("parses Telegram chat id with optional topic id", () => {
  expect(parseTelegramTarget("-1001234567890")).toEqual({
    chatId: "-1001234567890",
  });

  expect(parseTelegramTarget("-1001234567890:42")).toEqual({
    chatId: "-1001234567890",
    messageThreadId: 42,
  });

  expect(parseTelegramTarget("@channel_name/99")).toEqual({
    chatId: "@channel_name",
    messageThreadId: 99,
  });

  expect(() => parseTelegramTarget("-1001234567890:topic")).toThrow("positive integer");
});

test("sends Telegram message_thread_id when topic id is included", async () => {
  const originalFetch = globalThis.fetch;
  let payload: unknown;

  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    payload = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as typeof fetch;

  try {
    await sendTelegramNotification("token", "-1001234567890:42", "Feed", {
      id: "123",
      url: "https://www.house.kg/details/123",
      title: "Apartment",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  expect(payload).toMatchObject({
    chat_id: "-1001234567890",
    message_thread_id: 42,
    text: expect.stringContaining("Apartment"),
  });
});
