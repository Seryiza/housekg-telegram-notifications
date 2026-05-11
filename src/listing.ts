import type { ExtractedListing, NormalizedListing } from "./types";

const HOUSEKG_BASE_URL = "https://www.house.kg";

export function normalizeExtractedListing(input: ExtractedListing): NormalizedListing | undefined {
  const absoluteUrl = normalizeAbsoluteUrl(input.link);
  if (!absoluteUrl) {
    return undefined;
  }

  const idFromUrl = getHouseKgDetailsId(absoluteUrl);
  const id = idFromUrl ?? absoluteUrl;
  const title = cleanString(input.title) ?? "House.kg listing";
  const images = normalizeImageUrls(input.images);

  return {
    id,
    link: absoluteUrl,
    title,
    ...optionalField("address", input.address),
    ...optionalField("monthlyPrice", input.monthlyPrice),
    ...optionalField("fullDescription", input.fullDescription),
    ...(images.length > 0 ? { images } : {}),
    ...optionalField("postedDate", input.postedDate),
    ...optionalOfferType(input.offerType),
    ...optionalField("contactPhone", input.contactPhone),
    ...(typeof input.detailStatus === "number" || input.detailStatus === null
      ? { detailStatus: input.detailStatus }
      : {}),
    ...(typeof input.detailOk === "boolean" ? { detailOk: input.detailOk } : {}),
    ...optionalField("detailError", input.detailError),
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

function normalizeImageUrls(images: string[] | undefined): string[] {
  const urls = new Set<string>();
  for (const value of images ?? []) {
    const normalized = normalizeAbsoluteUrl(value);
    if (normalized) {
      urls.add(normalized);
    }
  }
  return [...urls];
}

function optionalOfferType(value: ExtractedListing["offerType"]): Pick<NormalizedListing, "offerType"> | {} {
  return value === "agent" || value === "owner" ? { offerType: value } : {};
}
