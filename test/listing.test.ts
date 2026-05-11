import { describe, expect, test } from "bun:test";
import { getHouseKgDetailsId, normalizeAbsoluteUrl, normalizeExtractedListing } from "../src/listing";

describe("listing URL normalization", () => {
  test("extracts House.kg details id from absolute and relative URLs", () => {
    expect(getHouseKgDetailsId("https://www.house.kg/details/123456?foo=bar")).toBe("123456");
    expect(getHouseKgDetailsId("/details/abc-123/")).toBe("abc-123");
  });

  test("normalizes relative URLs against House.kg", () => {
    expect(normalizeAbsoluteUrl("/details/123456#photos")).toBe("https://www.house.kg/details/123456");
  });

  test("uses details id and falls back to URL", () => {
    expect(
      normalizeExtractedListing({
        id: "card-id",
        link: "/details/123456",
        title: "  2 rooms   in Bishkek ",
      }),
    ).toMatchObject({
      id: "123456",
      link: "https://www.house.kg/details/123456",
      title: "2 rooms in Bishkek",
    });

    const fallback = normalizeExtractedListing({
      id: "card-id",
      link: "/listing-without-details",
      title: "Listing",
    });
    expect(fallback?.id).toBe("https://www.house.kg/listing-without-details");
  });

  test("normalizes enriched workflow listings", () => {
    expect(
      normalizeExtractedListing({
        link: "/details/123456",
        title: "  2 rooms   in Bishkek ",
        monthlyPrice: "44 000 KGS",
        postedDate: "Today",
        address: "Bishkek",
        images: ["/uploads/a.jpg", "https://www.house.kg/uploads/b.jpg", "/uploads/a.jpg"],
        fullDescription: "Fresh repair and furniture.",
        offerType: "owner",
        contactPhone: "+996 555 000 000",
        detailStatus: 200,
        detailOk: true,
      }),
    ).toMatchObject({
      id: "123456",
      link: "https://www.house.kg/details/123456",
      title: "2 rooms in Bishkek",
      monthlyPrice: "44 000 KGS",
      postedDate: "Today",
      fullDescription: "Fresh repair and furniture.",
      images: ["https://www.house.kg/uploads/a.jpg", "https://www.house.kg/uploads/b.jpg"],
      offerType: "owner",
      contactPhone: "+996 555 000 000",
      detailStatus: 200,
      detailOk: true,
    });
  });
});
