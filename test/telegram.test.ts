import { expect, test } from "bun:test";
import { formatListingMessage, parseTelegramTarget, sendTelegramNotification } from "../src/telegram";

test("formats Telegram listing messages with useful fields", () => {
  const message = formatListingMessage("Bishkek apartments", {
    id: "123",
    link: "https://www.house.kg/details/123",
    title: "2-room apartment",
    monthlyPrice: "44 000 KGS",
    address: "Bishkek, Toktogul",
    fullDescription: "Fresh repair and furniture.",
    postedDate: "Today",
    offerType: "owner",
    contactPhone: "+996 555 000 000",
  });

  expect(message).toContain("Bishkek apartments");
  expect(message).toContain("2-room apartment");
  expect(message).toContain("44 000 KGS");
  expect(message).toContain("Bishkek, Toktogul");
  expect(message).toContain("Owner");
  expect(message).toContain("Phone: +996 555 000 000");
  expect(message).toContain("Fresh repair and furniture.");
  expect(message).toContain("https://www.house.kg/details/123");
});

test("formats unavailable detail status when enrichment fails", () => {
  const message = formatListingMessage("Feed", {
    id: "123",
    link: "https://www.house.kg/details/123",
    title: "Apartment",
    detailStatus: 404,
    detailOk: false,
    detailError: "not_found",
  });

  expect(message).toContain("Details unavailable: HTTP 404, not_found");
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
      link: "https://www.house.kg/details/123",
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

test("sends multiple listing images as a Telegram media group", async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl = "";
  let payload: unknown;

  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(url);
    payload = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as typeof fetch;

  try {
    await sendTelegramNotification("token", "-1001234567890", "Feed", {
      id: "123",
      link: "https://www.house.kg/details/123",
      title: "Apartment",
      images: ["https://www.house.kg/a.jpg", "https://www.house.kg/b.jpg"],
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  expect(requestUrl).toContain("/sendMediaGroup");
  expect(payload).toMatchObject({
    chat_id: "-1001234567890",
    media: [
      {
        type: "photo",
        media: "https://www.house.kg/a.jpg",
        caption: expect.stringContaining("Apartment"),
      },
      {
        type: "photo",
        media: "https://www.house.kg/b.jpg",
      },
    ],
  });
});

test("retries Telegram media group after retry_after rate limit", async () => {
  const originalFetch = globalThis.fetch;
  const originalSetTimeout = globalThis.setTimeout;
  const originalWarn = console.warn;
  const delays: number[] = [];
  let attempts = 0;

  globalThis.fetch = (async (_url: string | URL | Request, _init?: RequestInit) => {
    attempts += 1;
    if (attempts === 1) {
      return new Response(
        JSON.stringify({
          ok: false,
          error_code: 429,
          description: "Too Many Requests: retry after 5",
          parameters: { retry_after: 5 },
        }),
        { status: 429 },
      );
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as typeof fetch;
  globalThis.setTimeout = immediateTimeout(delays);
  console.warn = () => {};

  try {
    await sendTelegramNotification("token", "-1001234567890", "Feed", {
      id: "123",
      link: "https://www.house.kg/details/123",
      title: "Apartment",
      images: ["https://www.house.kg/a.jpg", "https://www.house.kg/b.jpg"],
    });
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.setTimeout = originalSetTimeout;
    console.warn = originalWarn;
  }

  expect(attempts).toBe(2);
  expect(delays).toEqual([5_000]);
});

test("keeps retrying repeated Telegram rate limits until the request succeeds", async () => {
  const originalFetch = globalThis.fetch;
  const originalSetTimeout = globalThis.setTimeout;
  const originalWarn = console.warn;
  const delays: number[] = [];
  let attempts = 0;

  globalThis.fetch = (async (_url: string | URL | Request, _init?: RequestInit) => {
    attempts += 1;
    if (attempts === 1) {
      return new Response(JSON.stringify({ ok: false, parameters: { retry_after: 2 } }), {
        status: 429,
      });
    }
    if (attempts === 2) {
      return new Response(JSON.stringify({ ok: false, parameters: { retry_after: 7 } }), {
        status: 429,
      });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as typeof fetch;
  globalThis.setTimeout = immediateTimeout(delays);
  console.warn = () => {};

  try {
    await sendTelegramNotification("token", "-1001234567890", "Feed", {
      id: "123",
      link: "https://www.house.kg/details/123",
      title: "Apartment",
    });
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.setTimeout = originalSetTimeout;
    console.warn = originalWarn;
  }

  expect(attempts).toBe(3);
  expect(delays).toEqual([2_000, 7_000]);
});

test("does not retry non-rate-limit Telegram failures", async () => {
  const originalFetch = globalThis.fetch;
  const originalSetTimeout = globalThis.setTimeout;
  const delays: number[] = [];
  let attempts = 0;

  globalThis.fetch = (async (_url: string | URL | Request, _init?: RequestInit) => {
    attempts += 1;
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }) as typeof fetch;
  globalThis.setTimeout = immediateTimeout(delays);

  try {
    await expect(
      sendTelegramNotification("token", "-1001234567890", "Feed", {
        id: "123",
        link: "https://www.house.kg/details/123",
        title: "Apartment",
      }),
    ).rejects.toThrow("Telegram sendMessage failed with 500");
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.setTimeout = originalSetTimeout;
  }

  expect(attempts).toBe(1);
  expect(delays).toEqual([]);
});

function immediateTimeout(delays: number[]): typeof setTimeout {
  return ((handler: Parameters<typeof setTimeout>[0], timeout?: Parameters<typeof setTimeout>[1], ...args: unknown[]) => {
    delays.push(Number(timeout));
    if (typeof handler === "function") {
      const callback = handler as (...callbackArgs: unknown[]) => void;
      callback(...args);
    }
    return 0 as unknown as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout;
}
