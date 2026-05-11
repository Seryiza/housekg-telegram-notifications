import { describe, expect, test } from "bun:test";
import { parseFeedsConfig } from "../src/config";

describe("feed config validation", () => {
  test("accepts valid object config", () => {
    expect(
      parseFeedsConfig({
        feeds: [
          {
            id: "bishkek_1",
            title: "Bishkek",
            url: "https://www.house.kg/kupit-kvartiru",
            enabled: true,
          },
        ],
      }),
    ).toHaveLength(1);
  });

  test("rejects missing id", () => {
    expect(() =>
      parseFeedsConfig({
        feeds: [
          {
            title: "Bishkek",
            url: "https://www.house.kg/kupit-kvartiru",
            enabled: true,
          },
        ],
      }),
    ).toThrow("id");
  });

  test("rejects invalid URL", () => {
    expect(() =>
      parseFeedsConfig({
        feeds: [
          {
            id: "bad",
            title: "Bad",
            url: "not-a-url",
            enabled: true,
          },
        ],
      }),
    ).toThrow("valid absolute URL");
  });

  test("rejects duplicate ids", () => {
    expect(() =>
      parseFeedsConfig({
        feeds: [
          {
            id: "same",
            title: "One",
            url: "https://www.house.kg/kupit-kvartiru",
            enabled: true,
          },
          {
            id: "same",
            title: "Two",
            url: "https://www.house.kg/snyat-kvartiru",
            enabled: true,
          },
        ],
      }),
    ).toThrow("Duplicate feed id");
  });
});
