import { describe, expect, it, test } from "vitest";
import {
  ebayXmlError,
  sanitizeEbayImageUrls,
  validListingPrice,
} from "@/lib/ebay/publish";
import { prioritizeAspects } from "@/lib/ebay/aspectFill";
import type { AspectMeta } from "@/lib/ebay/taxonomy";

describe("validListingPrice", () => {
  test("passes real prices through unchanged — no 18% markup", () => {
    expect(validListingPrice(20)).toBe(20);
    expect(validListingPrice("49.99")).toBe(49.99);
    expect(validListingPrice(100)).toBe(100);
  });

  test("rounds to cents", () => {
    expect(validListingPrice(19.999)).toBe(20);
  });

  test("missing/invalid prices block publish instead of becoming $35.39", () => {
    expect(validListingPrice(undefined)).toBeNull();
    expect(validListingPrice(0)).toBeNull();
    expect(validListingPrice(-5)).toBeNull();
    expect(validListingPrice("")).toBeNull();
    expect(validListingPrice("abc")).toBeNull();
  });
});

describe("prioritizeAspects", () => {
  const meta = (name: string, usage: AspectMeta["usage"]): AspectMeta => ({
    name,
    required: usage === "REQUIRED",
    usage,
    mode: "FREE_TEXT",
    cardinality: "SINGLE",
    values: [],
  });

  test("required aspects come first, then recommended, then optional", () => {
    const sorted = prioritizeAspects([
      meta("Opt1", "OPTIONAL"),
      meta("Rec1", "RECOMMENDED"),
      meta("Req1", "REQUIRED"),
      meta("Opt2", "OPTIONAL"),
      meta("Rec2", "RECOMMENDED"),
    ]);
    expect(sorted.map((a) => a.usage)).toEqual([
      "REQUIRED",
      "RECOMMENDED",
      "RECOMMENDED",
      "OPTIONAL",
      "OPTIONAL",
    ]);
    // Stable within a tier.
    expect(sorted.map((a) => a.name)).toEqual([
      "Req1",
      "Rec1",
      "Rec2",
      "Opt1",
      "Opt2",
    ]);
  });
});

describe("sanitizeEbayImageUrls", () => {
  const eps = (n: number) =>
    `https://i.ebayimg.com/00/s/MTYwMFgxMjAw/z/pic${n}.jpg`;

  test("accepts https eBay Picture Services URLs, preserving order", () => {
    const urls = [eps(1), eps(2), eps(3)];
    expect(sanitizeEbayImageUrls(urls)).toEqual(urls);
  });

  test("rejects non-eBay hosts, plain http, and junk", () => {
    expect(
      sanitizeEbayImageUrls([
        "https://evil.example.com/pic.jpg",
        "http://i.ebayimg.com/insecure.jpg",
        "https://notebayimg.com/pic.jpg",
        "https://fakeebayimg.com.evil.net/pic.jpg",
        "not a url",
        42,
        null,
      ]),
    ).toEqual([]);
  });

  test("dedupes and caps at eBay's 24-photo limit", () => {
    const urls = Array.from({ length: 30 }, (_, i) => eps(i));
    expect(sanitizeEbayImageUrls(urls)).toHaveLength(24);
    expect(sanitizeEbayImageUrls([eps(1), eps(1), eps(2)])).toEqual([
      eps(1),
      eps(2),
    ]);
  });

  test("non-array input yields no URLs", () => {
    expect(sanitizeEbayImageUrls(undefined)).toEqual([]);
    expect(sanitizeEbayImageUrls("https://i.ebayimg.com/x.jpg")).toEqual([]);
  });
});

describe("ebayXmlError", () => {
  it("pulls code and long message out of a Trading API error block", () => {
    const xml = `<?xml version="1.0"?><UploadSiteHostedPicturesResponse>
      <Ack>Failure</Ack><Errors><ShortMessage>Invalid token.</ShortMessage>
      <LongMessage>Auth token is invalid.</LongMessage><ErrorCode>931</ErrorCode>
      </Errors></UploadSiteHostedPicturesResponse>`;
    expect(ebayXmlError(xml)).toBe("eBay error 931: Auth token is invalid.");
  });

  it("falls back to the short message when there is no long one", () => {
    expect(
      ebayXmlError("<Errors><ShortMessage>Nope.</ShortMessage></Errors>"),
    ).toBe("Nope.");
  });

  it("returns empty string when the body carries no error block", () => {
    expect(ebayXmlError("<Ack>Success</Ack>")).toBe("");
  });
});
