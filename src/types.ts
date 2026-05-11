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
  link?: string;
  title?: string;
  address?: string;
  monthlyPrice?: string;
  fullDescription?: string;
  images?: string[];
  postedDate?: string;
  offerType?: "agent" | "owner";
  contactPhone?: string;
  detailStatus?: number | null;
  detailOk?: boolean;
  detailError?: string;
}

export interface ExtractedFeed {
  feedTitle: string;
  items: ExtractedListing[];
}

export interface NormalizedListing {
  id: string;
  link: string;
  title: string;
  address?: string;
  monthlyPrice?: string;
  fullDescription?: string;
  images?: string[];
  postedDate?: string;
  offerType?: "agent" | "owner";
  contactPhone?: string;
  detailStatus?: number | null;
  detailOk?: boolean;
  detailError?: string;
}

export interface StoredListing extends NormalizedListing {
  feedId: string;
  firstSeenAt: string;
  lastSeenAt: string;
  notifiedAt?: string;
}

export type ScanStatus = "success" | "failed";
