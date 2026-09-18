// ── eBay business policy templates ───────────────────────────────────────────
//
// Two named sets of eBay business policies, picked automatically from what the
// AI decided the item is. Media goes out Media Mail; everything else goes out
// on the calculated parcel policy.
//
// EDIT THE NAMES BELOW if you rename a policy in eBay. They are matched
// against the policy names in your own eBay account, ignoring case, spaces and
// punctuation — so "All Returns 30" matches "all returns 30" and
// "All-Returns-30", but not "All Returns 30 Day". If a name here matches
// nothing in your account, the app tells you which one it could not find
// instead of silently leaving the dropdown blank.

export type PolicyTemplateKey = "media" | "non_media";

export interface PolicyTemplate {
  /** Shown in the template picker on each item. */
  label: string;
  /** Short note under the picker explaining what this template does. */
  note: string;
  /**
   * Package weight in ounces sent to eBay when the seller leaves the weight
   * field blank. Media Mail is free to the buyer but still priced by weight,
   * so eBay rejects the publish with error 25020 when no weight is present.
   *
   * Leave undefined to fall back to the per-item-class defaults in
   * lib/ebay/publish.ts, which vary by what the item is.
   */
  defaultWeightOz?: number;
  fulfillmentPolicyId: string;
  paymentPolicyId: string;
  returnPolicyId: string;
  locationKey: string;
}

export const POLICY_TEMPLATES: Record<PolicyTemplateKey, PolicyTemplate> = {
  media: {
    label: "Media — Media Mail",
    note: "Books, CDs, DVDs, Blu-rays, VHS and vinyl. Ships at 16 oz (1 lb) unless you enter a weight — that is the bottom Media Mail rate. Set a real weight for textbooks, hardcovers and box sets, or USPS will bill the difference.",
    // 1 lb exactly: USPS Media Mail's cheapest tier is "1 lb or less", so this
    // is the lowest rate that covers most single media items. Heavier pieces
    // need a weight typed in on the item.
    defaultWeightOz: 16,
    fulfillmentPolicyId: "Free Media Mail",
    paymentPolicyId: "eBay Managed Payments (330150692021)",
    returnPolicyId: "All Returns 30",
    locationKey: "Default location",
  },
  non_media: {
    label: "Non-media — calculated parcel",
    note: "Everything else. Buyer pays calculated shipping, so eBay needs a package weight — the app fills one in per item type.",
    fulfillmentPolicyId: "Calculated: USPSParcel , 1 business day (330503687021)",
    paymentPolicyId: "eBay Managed Payments (330150692021)",
    returnPolicyId: "All Returns 30",
    locationKey: "Default location",
  },
};

export const TEMPLATE_KEYS: PolicyTemplateKey[] = ["media", "non_media"];

/** The template fields that name an eBay policy, as opposed to metadata. */
export type PolicyField =
  | "fulfillmentPolicyId"
  | "paymentPolicyId"
  | "returnPolicyId"
  | "locationKey";

/** Which of the four dropdowns each policy field drives. */
export const TEMPLATE_FIELD_LABELS: Record<PolicyField, string> = {
  fulfillmentPolicyId: "Shipping policy",
  paymentPolicyId: "Payment policy",
  returnPolicyId: "Return policy",
  locationKey: "Shipping origin",
};

// ── Which items count as media ───────────────────────────────────────────────
//
// These are the `category` keys the analysis prompt returns. The item's
// `item_profile` ("media") is used as a backstop when the category key is
// something vaguer.

export const MEDIA_CATEGORY_KEYS = new Set([
  "book",
  "media",
  "cd",
  "dvd_bluray",
  "vinyl_record",
]);

// Video games route to the "media" profile because they are written like
// media, but USPS does NOT accept video games as Media Mail — shipping one
// that way risks the package being refused or postage-due on delivery. So they
// are forced to the non-media template even though their profile says media.
// If you disagree, move "video_game" into MEDIA_CATEGORY_KEYS above and delete
// it from here.
export const MEDIA_MAIL_INELIGIBLE_CATEGORY_KEYS = new Set(["video_game"]);

export interface TemplateSubject {
  category?: string;
  item_profile?: string;
}

/**
 * Pick a template from what the AI decided the item is. Falls back to
 * non-media, which is the safe direction: a book sent on the parcel policy
 * costs the buyer more, but a board game sent Media Mail can be rejected.
 */
export function detectPolicyTemplate(
  listing?: TemplateSubject,
): PolicyTemplateKey {
  if (!listing) return "non_media";
  const key = (s?: string) => (s ?? "").trim().toLowerCase();
  const category = key(listing.category);
  if (MEDIA_MAIL_INELIGIBLE_CATEGORY_KEYS.has(category)) return "non_media";
  if (MEDIA_CATEGORY_KEYS.has(category)) return "media";
  if (key(listing.item_profile) === "media") return "media";
  return "non_media";
}
