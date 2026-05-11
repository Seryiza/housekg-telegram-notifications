import { afterEach, describe, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { Store } from "../src/db";

const dbPath = join("/tmp", `housekg-test-${process.pid}.sqlite`);

afterEach(() => {
  for (const suffix of ["", "-shm", "-wal"]) {
    rmSync(`${dbPath}${suffix}`, { force: true });
  }
});

describe("SQLite listing duplicates", () => {
  test("same listing in same feed is only unnotified once", () => {
    const store = new Store(dbPath);
    store.upsertFeeds([
      {
        id: "feed-a",
        title: "Feed A",
        url: "https://www.house.kg/kupit-kvartiru",
        enabled: true,
      },
    ]);

    const listing = {
      id: "123",
      link: "https://www.house.kg/details/123",
      title: "2-room apartment",
    };

    const first = store.upsertListing("feed-a", listing, "2026-05-11T00:00:00.000Z");
    expect(first.notifiedAt).toBeUndefined();

    store.markListingNotified("feed-a", "123", "2026-05-11T00:01:00.000Z");

    const second = store.upsertListing("feed-a", listing, "2026-05-11T00:02:00.000Z");
    expect(second.notifiedAt).toBe("2026-05-11T00:01:00.000Z");

    store.close();
  });
});
