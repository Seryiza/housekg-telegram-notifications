import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { Database } from "bun:sqlite";
import type { FeedConfig, NormalizedListing, ScanStatus, StoredListing } from "./types";

interface ListingRow {
  id: string;
  feed_id: string;
  url: string;
  title: string;
  first_seen_at: string;
  last_seen_at: string;
  notified_at: string | null;
}

export class Store {
  private readonly db: Database;

  constructor(databasePath: string) {
    mkdirSync(dirname(databasePath), { recursive: true });
    this.db = new Database(databasePath);
    this.db.run("PRAGMA foreign_keys = ON");
    this.db.run("PRAGMA journal_mode = WAL");
    this.migrate();
  }

  close(): void {
    this.db.close();
  }

  upsertFeeds(feeds: FeedConfig[]): void {
    const now = new Date().toISOString();
    const statement = this.db.prepare(`
      INSERT INTO feeds (id, title, url, enabled, created_at, updated_at)
      VALUES ($id, $title, $url, $enabled, $now, $now)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        url = excluded.url,
        enabled = excluded.enabled,
        updated_at = excluded.updated_at
    `);

    const tx = this.db.transaction((items: FeedConfig[]) => {
      for (const feed of items) {
        statement.run({
          $id: feed.id,
          $title: feed.title,
          $url: feed.url,
          $enabled: feed.enabled ? 1 : 0,
          $now: now,
        });
      }
    });

    tx(feeds);
  }

  beginScan(feedId: string, startedAt = new Date().toISOString()): number {
    const result = this.db
      .prepare("INSERT INTO scan_runs (feed_id, started_at, status) VALUES (?, ?, ?)")
      .run(feedId, startedAt, "failed");
    return Number(result.lastInsertRowid);
  }

  finishScan(scanRunId: number, status: ScanStatus, error?: string): void {
    this.db
      .prepare("UPDATE scan_runs SET finished_at = ?, status = ?, error = ? WHERE id = ?")
      .run(new Date().toISOString(), status, error ?? null, scanRunId);
  }

  upsertListing(feedId: string, listing: NormalizedListing, now = new Date().toISOString()): StoredListing {
    this.db
      .prepare(`
        INSERT INTO listings (id, feed_id, url, title, first_seen_at, last_seen_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(feed_id, id) DO UPDATE SET
          url = excluded.url,
          title = excluded.title,
          last_seen_at = excluded.last_seen_at
      `)
      .run(listing.id, feedId, listing.link, listing.title, now, now);

    const row = this.db
      .query<ListingRow, [string, string]>(`
        SELECT id, feed_id, url, title, first_seen_at, last_seen_at, notified_at
        FROM listings
        WHERE feed_id = ? AND id = ?
      `)
      .get(feedId, listing.id);

    if (!row) {
      throw new Error(`Failed to load listing ${feedId}/${listing.id} after upsert`);
    }

    return {
      ...listing,
      feedId: row.feed_id,
      firstSeenAt: row.first_seen_at,
      lastSeenAt: row.last_seen_at,
      ...(row.notified_at ? { notifiedAt: row.notified_at } : {}),
    };
  }

  markListingNotified(feedId: string, listingId: string, notifiedAt = new Date().toISOString()): void {
    this.db
      .prepare("UPDATE listings SET notified_at = ? WHERE feed_id = ? AND id = ?")
      .run(notifiedAt, feedId, listingId);
  }

  getListing(feedId: string, listingId: string): StoredListing | undefined {
    const row = this.db
      .query<ListingRow, [string, string]>(`
        SELECT id, feed_id, url, title, first_seen_at, last_seen_at, notified_at
        FROM listings
        WHERE feed_id = ? AND id = ?
      `)
      .get(feedId, listingId);

    if (!row) {
      return undefined;
    }

    return {
      id: row.id,
      feedId: row.feed_id,
      link: row.url,
      title: row.title,
      firstSeenAt: row.first_seen_at,
      lastSeenAt: row.last_seen_at,
      ...(row.notified_at ? { notifiedAt: row.notified_at } : {}),
    };
  }

  private migrate(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS feeds (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS listings (
        id TEXT NOT NULL,
        feed_id TEXT NOT NULL,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        first_seen_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        notified_at TEXT,
        PRIMARY KEY (feed_id, id),
        FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS scan_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feed_id TEXT NOT NULL,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        status TEXT NOT NULL,
        error TEXT,
        FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE
      )
    `);
  }
}
