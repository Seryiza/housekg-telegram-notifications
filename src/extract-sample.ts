import { loadFeedsConfig } from "./config";
import { loadDotEnv } from "./env";
import { runExtractor } from "./extractor";
import type { FeedConfig } from "./types";

loadDotEnv();

const configPath = process.env.FEEDS_CONFIG_PATH?.trim() || "./feeds.config.json";
const urlArg = Bun.argv[2];

let feed: FeedConfig;
if (urlArg) {
  feed = {
    id: "sample",
    title: "Sample House.kg feed",
    url: urlArg,
    enabled: true,
  };
} else {
  const feeds = loadFeedsConfig(configPath);
  const enabledFeed = feeds.find((item) => item.enabled);
  if (!enabledFeed) {
    throw new Error(`No enabled feeds found in ${configPath}; pass a URL argument instead`);
  }
  feed = enabledFeed;
}

const result = await runExtractor(feed);
console.log(JSON.stringify(result, null, 2));
