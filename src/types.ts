export interface FeedConfig {
  id: string;
  title: string;
  url: string;
  enabled: boolean;
}

export interface RuntimeConfig {
  telegramBotToken: string;
  telegramChatId: string;
  databasePath: string;
  pollIntervalMs: number;
  feedsConfigPath: string;
}

export interface ExtractedListing {
  id?: string;
  url?: string;
  title?: string;
  address?: string;
  price?: string;
  priceAlt?: string;
  description?: string;
  photoUrl?: string;
  publishedText?: string;
}

export interface ExtractedFeed {
  feedTitle: string;
  items: ExtractedListing[];
}

export interface NormalizedListing {
  id: string;
  url: string;
  title: string;
  address?: string;
  price?: string;
  priceAlt?: string;
  description?: string;
  photoUrl?: string;
  publishedText?: string;
}

export interface StoredListing extends NormalizedListing {
  feedId: string;
  firstSeenAt: string;
  lastSeenAt: string;
  notifiedAt?: string;
}

export type ScanStatus = "success" | "failed";
