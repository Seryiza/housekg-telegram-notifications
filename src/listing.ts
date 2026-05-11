import type { ExtractedListing, NormalizedListing } from "./types";

const HOUSEKG_BASE_URL = "https://www.house.kg";

export function normalizeExtractedListing(input: ExtractedListing): NormalizedListing | undefined {
  const absoluteUrl = normalizeAbsoluteUrl(input.url);
  if (!absoluteUrl) {
    return undefined;
  }

  const idFromUrl = getHouseKgDetailsId(absoluteUrl);
  const id = idFromUrl ?? absoluteUrl;
  const title = cleanString(input.title) ?? "House.kg listing";

  return {
    id,
    url: absoluteUrl,
    title,
    ...optionalField("address", input.address),
    ...optionalField("price", input.price),
    ...optionalField("priceAlt", input.priceAlt),
    ...optionalField("description", input.description),
    ...optionalField("photoUrl", normalizeAbsoluteUrl(input.photoUrl)),
    ...optionalField("publishedText", input.publishedText),
  };
}

export function normalizeAbsoluteUrl(value: string | undefined): string | undefined {
  const trimmed = cleanString(value);
  if (!trimmed) {
    return undefined;
  }

  try {
    const url = new URL(trimmed, HOUSEKG_BASE_URL);
    url.hash = "";

    if (url.pathname.length > 1) {
      url.pathname = url.pathname.replace(/\/+$/, "");
    }

    return url.toString();
  } catch {
    return undefined;
  }
}

export function getHouseKgDetailsId(value: string | undefined): string | undefined {
  const absoluteUrl = normalizeAbsoluteUrl(value);
  if (!absoluteUrl) {
    return undefined;
  }

  const url = new URL(absoluteUrl);
  const match = url.pathname.match(/\/details\/([^/]+)/i);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

export function cleanString(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned || undefined;
}

function optionalField<Key extends keyof NormalizedListing>(
  key: Key,
  value: string | undefined,
): Partial<Pick<NormalizedListing, Key>> {
  const cleaned = cleanString(value);
  return cleaned ? { [key]: cleaned } as Partial<Pick<NormalizedListing, Key>> : {};
}
