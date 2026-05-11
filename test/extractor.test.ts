import { describe, expect, test } from "bun:test";
import { parseExtractorOutput } from "../src/extractor";

describe("extractor output parsing", () => {
  test("accepts workflow output without legacy feedTitle", () => {
    expect(
      parseExtractorOutput(
        JSON.stringify({
          items: [
            {
              title: "2-room apartment",
              monthlyPrice: "44 000 KGS",
              postedDate: "Today",
              address: "Bishkek",
              link: "https://www.house.kg/details/123",
              images: ["https://www.house.kg/a.jpg", "https://www.house.kg/b.jpg"],
              fullDescription: "Fresh repair.",
              offerType: "owner",
              contactPhone: "+996 555 000 000",
              detailStatus: 200,
              detailOk: true,
            },
          ],
        }),
        "Feed title",
      ),
    ).toEqual({
      feedTitle: "Feed title",
      items: [
        {
          title: "2-room apartment",
          monthlyPrice: "44 000 KGS",
          postedDate: "Today",
          address: "Bishkek",
          link: "https://www.house.kg/details/123",
          images: ["https://www.house.kg/a.jpg", "https://www.house.kg/b.jpg"],
          fullDescription: "Fresh repair.",
          offerType: "owner",
          contactPhone: "+996 555 000 000",
          detailStatus: 200,
          detailOk: true,
        },
      ],
    });
  });
});
