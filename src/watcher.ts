import { extractFeedListings } from "./extractor";
import { Store } from "./db";
import { sendTelegramNotification } from "./telegram";
import type { FeedConfig, RuntimeConfig } from "./types";

export class Watcher {
  private timer: ReturnType<typeof setInterval> | undefined;
  private scanning = false;

  constructor(
    private readonly config: RuntimeConfig,
    private readonly feeds: FeedConfig[],
    private readonly store: Store,
  ) {}

  async start(): Promise<void> {
    await this.scanAll();

    this.timer = setInterval(() => {
      this.scanAll().catch((error) => {
        console.error("Unexpected scan failure", error);
      });
    }, this.config.pollIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async scanAll(): Promise<void> {
    if (this.scanning) {
      console.warn("Skipping scan because the previous scan is still running");
      return;
    }

    this.scanning = true;
    try {
      const enabledFeeds = this.feeds.filter((feed) => feed.enabled);
      console.log(`Scanning ${enabledFeeds.length} enabled feed(s)`);

      for (const feed of enabledFeeds) {
        await this.scanFeed(feed);
      }
    } finally {
      this.scanning = false;
    }
  }

  private async scanFeed(feed: FeedConfig): Promise<void> {
    const scanRunId = this.store.beginScan(feed.id);
    try {
      const listings = await extractFeedListings(feed);
      let newCount = 0;

      for (const listing of listings) {
        const stored = this.store.upsertListing(feed.id, listing);
        if (!stored.notifiedAt) {
          await sendTelegramNotification(
            this.config.telegramBotToken,
            this.config.telegramChatId,
            feed.title,
            listing,
          );
          this.store.markListingNotified(feed.id, listing.id);
          newCount += 1;
        }
      }

      this.store.finishScan(scanRunId, "success");
      console.log(
        `Feed "${feed.title}" scan succeeded: ${listings.length} listing(s), ${newCount} new notification(s)`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.store.finishScan(scanRunId, "failed", message);
      console.error(`Feed "${feed.title}" scan failed: ${message}`);
    }
  }
}
