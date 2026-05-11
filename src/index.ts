import { loadFeedsConfig } from "./config";
import { Store } from "./db";
import { getRuntimeConfig, loadDotEnv } from "./env";
import { Watcher } from "./watcher";

loadDotEnv();

const config = getRuntimeConfig();
const feeds = loadFeedsConfig(config.feedsConfigPath);
const store = new Store(config.databasePath);

store.upsertFeeds(feeds);

const watcher = new Watcher(config, feeds, store);

const shutdown = () => {
  console.log("Shutting down");
  watcher.stop();
  store.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log(`Loaded ${feeds.length} feed(s) from ${config.feedsConfigPath}`);
console.log(`Polling every ${config.pollIntervalMs} ms`);

await watcher.start();
