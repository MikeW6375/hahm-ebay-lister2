import { describe, expect, it } from "vitest";
import {
  detectPolicyTemplate,
  POLICY_TEMPLATES,
  TEMPLATE_KEYS,
} from "@/lib/policy-templates";

describe("detectPolicyTemplate", () => {
  it("routes the media category keys to the media template", () => {
    for (const category of ["book", "media", "cd", "dvd_bluray", "vinyl_record"])
      expect(detectPolicyTemplate({ category })).toBe("media");
  });

  it("routes everything else to the non-media template", () => {
    for (const category of [
      "board_game",
      "womens_top",
      "electronics",
      "toy",
      "trading_card",
      "other",
    ])
      expect(detectPolicyTemplate({ category })).toBe("non_media");
  });

  it("keeps video games off Media Mail even though they route to the media profile", () => {
    expect(
      detectPolicyTemplate({ category: "video_game", item_profile: "media" }),
    ).toBe("non_media");
  });

  it("falls back to the item profile when the category key is unhelpful", () => {
    expect(detectPolicyTemplate({ category: "", item_profile: "media" })).toBe(
      "media",
    );
    expect(
      detectPolicyTemplate({ category: undefined, item_profile: "clothing" }),
    ).toBe("non_media");
  });

  it("ignores case and stray whitespace", () => {
    expect(detectPolicyTemplate({ category: "  DVD_Bluray " })).toBe("media");
  });

  it("defaults to non-media when there is no listing at all", () => {
    expect(detectPolicyTemplate()).toBe("non_media");
    expect(detectPolicyTemplate({})).toBe("non_media");
  });
});

describe("POLICY_TEMPLATES", () => {
  it("defines every template key with all four policies filled in", () => {
    for (const key of TEMPLATE_KEYS) {
      const t = POLICY_TEMPLATES[key];
      expect(t.label).toBeTruthy();
      expect(t.fulfillmentPolicyId).toBeTruthy();
      expect(t.paymentPolicyId).toBeTruthy();
      expect(t.returnPolicyId).toBeTruthy();
      expect(t.locationKey).toBeTruthy();
    }
  });

  it("gives media a 16 oz default and leaves non-media to per-item-class weights", () => {
    expect(POLICY_TEMPLATES.media.defaultWeightOz).toBe(16);
    expect(POLICY_TEMPLATES.non_media.defaultWeightOz).toBeUndefined();
  });

  it("differs only in the shipping policy", () => {
    const { media, non_media: nonMedia } = POLICY_TEMPLATES;
    expect(media.fulfillmentPolicyId).not.toBe(nonMedia.fulfillmentPolicyId);
    expect(media.paymentPolicyId).toBe(nonMedia.paymentPolicyId);
    expect(media.returnPolicyId).toBe(nonMedia.returnPolicyId);
    expect(media.locationKey).toBe(nonMedia.locationKey);
  });
});
