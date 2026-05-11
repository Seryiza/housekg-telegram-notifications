# House.kg Telegram Notifications

Bun + TypeScript watcher for House.kg search result pages. It extracts the first page of each configured feed with `yo-url-yo-json`, stores seen listings in SQLite, and sends Telegram notifications once per unique listing per feed.

## Setup

1. Install dependencies:

   ```sh
   bun install
   ```

2. Copy the sample env:

   ```sh
   cp .env.example .env
   ```

3. Edit `.env`:

   ```sh
   TELEGRAM_BOT_TOKEN=123456:...
   TELEGRAM_CHAT_ID=123456789
   ```

4. Edit `feeds.config.json` and add House.kg search URLs. See `feeds.config.example.json` for the expected shape.

## Commands

```sh
bun run start
bun run typecheck
bun test
bun run extract:sample
```

`bun run extract:sample` uses the first enabled feed from `feeds.config.json`, or accepts a URL:

```sh
bun run extract:sample "https://www.house.kg/kupit-kvartiru?..."
```

## Environment

- `TELEGRAM_BOT_TOKEN`: Telegram bot token.
- `TELEGRAM_CHAT_ID`: Telegram chat id to notify. To target a forum topic, use `chat_id:topic_id`, for example `-1001234567890:42`.
- `DATABASE_PATH`: SQLite database path, default `./data/housekg.sqlite`.
- `POLL_INTERVAL_MS`: scan interval, default `300000`.
- `FEEDS_CONFIG_PATH`: feed config path, default `./feeds.config.json`.
- `YO_URL_YO_JSON_BIN`: extractor binary name/path, default `yo-url-yo-json`.

On first run, every currently extracted listing is treated as new and will be notified. Later scans update existing listings without duplicate notifications.
