import { expect, it } from "vitest";
import {
  applyShippingDefaults,
  applyPolicyTemplate,
  resolvePolicyTemplate,
} from "@/lib/shipping-defaults";
import { shippingSchema } from "@/lib/validation";

// Mirrors what fetchAccountOptions returns for this seller's eBay account.
const options = {
  fulfillment: [
    { id: "parcel", name: "Calculated: USPSParcel , 1 business day (330503687021)" },
    { id: "mediamail", name: "Free Media Mail" },
    { id: "heavy", name: "Heavy shipping" },
  ],
  payment: [{ id: "payment", name: "eBay Managed Payments (330150692021)" }],
  returns: [{ id: "return", name: "All Returns 30" }],
  locations: [{ id: "origin", name: "Default location · 15221 · US" }],
};

it("fills the non-media template by default and leaves seller overrides alone", () => {
  expect(applyShippingDefaults({}, options)).toEqual({
    fulfillmentPolicyId: "parcel",
    paymentPolicyId: "payment",
    returnPolicyId: "return",
    locationKey: "origin",
  });
  expect(
    applyShippingDefaults({ fulfillmentPolicyId: "heavy" }, options)
      .fulfillmentPolicyId,
  ).toBe("heavy");
  expect(
    applyShippingDefaults({}, { ...options, fulfillment: [] }),
  ).not.toHaveProperty("fulfillmentPolicyId");
});

it("fills the media template with Media Mail, sharing the other three policies", () => {
  expect(applyShippingDefaults({}, options, "media")).toEqual({
    fulfillmentPolicyId: "mediamail",
    paymentPolicyId: "payment",
    returnPolicyId: "return",
    locationKey: "origin",
  });
});

it("matches policy names ignoring case, spacing and punctuation", () => {
  const messy = {
    ...options,
    returns: [{ id: "return", name: "all-returns-30" }],
  };
  expect(resolvePolicyTemplate(messy, "media").ids.returnPolicyId).toBe(
    "return",
  );
});

it("reports names it could not find instead of failing silently", () => {
  const renamed = { ...options, fulfillment: [{ id: "x", name: "Media Mail" }] };
  const { unmatched } = resolvePolicyTemplate(renamed, "media");
  expect(unmatched).toHaveLength(1);
  expect(unmatched[0]).toMatchObject({
    field: "fulfillmentPolicyId",
    label: "Shipping policy",
    wanted: "Free Media Mail",
    reason: "missing",
  });
});

it("switching template overwrites policies but keeps measurements", () => {
  const current = {
    fulfillmentPolicyId: "parcel",
    paymentPolicyId: "payment",
    returnPolicyId: "return",
    locationKey: "origin",
    weightOz: 14,
  };
  const { shipping, unmatched } = applyPolicyTemplate(
    current,
    options,
    "media",
  );
  expect(unmatched).toHaveLength(0);
  expect(shipping.fulfillmentPolicyId).toBe("mediamail");
  expect(shipping.weightOz).toBe(14);
});

it("an unresolvable policy keeps its previous value rather than blanking", () => {
  const stripped = { ...options, fulfillment: [{ id: "parcel", name: "Calculated: USPSParcel , 1 business day (330503687021)" }] };
  const { shipping, unmatched } = applyPolicyTemplate(
    { fulfillmentPolicyId: "parcel" },
    stripped,
    "media",
  );
  expect(shipping.fulfillmentPolicyId).toBe("parcel");
  expect(unmatched.map((u) => u.field)).toContain("fulfillmentPolicyId");
});

it("allows absent measurements and rejects partial or invalid provided measurements", () => {
  const defaults = applyShippingDefaults({}, options);
  expect(shippingSchema.safeParse(defaults).success).toBe(true);
  expect(shippingSchema.safeParse({ ...defaults, weightOz: 0 }).success).toBe(
    false,
  );
  expect(shippingSchema.safeParse({ ...defaults, lengthIn: 10 }).success).toBe(
    false,
  );
  expect(shippingSchema.safeParse({ ...defaults, weightOz: 8 }).success).toBe(
    true,
  );
});
