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
  fulfillmentPolicyId: string;
  paymentPolicyId: string;
  returnPolicyId: string;
  locationKey: string;
}

export const POLICY_TEMPLATES: Record<PolicyTemplateKey, PolicyTemplate> = {
  media: {
    label: "Media — Media Mail",
    note: "Books, CDs, DVDs, Blu-rays, VHS and vinyl. Free shipping, so no package measurements are needed.",
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

/** Which of the four dropdowns each template field drives. */
export const TEMPLATE_FIELD_LABELS: Record<
  keyof Omit<PolicyTemplate, "label" | "note">,
  string
> = {
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
