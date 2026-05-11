import { existsSync, readFileSync } from "node:fs";
import type { RuntimeConfig } from "./types";

const DEFAULT_DATABASE_PATH = "./data/housekg.sqlite";
const DEFAULT_POLL_INTERVAL_MS = 300_000;
const DEFAULT_FEEDS_CONFIG_PATH = "./feeds.config.json";

export function loadDotEnv(filePath = ".env"): void {
  if (!existsSync(filePath)) {
    return;
  }

  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");
    if (equalsIndex <= 0) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    const value = stripEnvQuotes(line.slice(equalsIndex + 1).trim());
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

export function getRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const pollIntervalMs = parsePositiveInteger(
    env.POLL_INTERVAL_MS,
    DEFAULT_POLL_INTERVAL_MS,
    "POLL_INTERVAL_MS",
  );

  return {
    telegramBotToken: requireEnv(env.TELEGRAM_BOT_TOKEN, "TELEGRAM_BOT_TOKEN"),
    telegramChatId: requireEnv(env.TELEGRAM_CHAT_ID, "TELEGRAM_CHAT_ID"),
    databasePath: env.DATABASE_PATH?.trim() || DEFAULT_DATABASE_PATH,
    pollIntervalMs,
    feedsConfigPath: env.FEEDS_CONFIG_PATH?.trim() || DEFAULT_FEEDS_CONFIG_PATH,
  };
}

function requireEnv(value: string | undefined, name: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return trimmed;
}

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
  name: string,
): number {
  if (!value?.trim()) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function stripEnvQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
