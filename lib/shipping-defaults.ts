import type { AccountOptions } from "./ebay/publish";
import type { ShippingSelection } from "./validation";
import {
  POLICY_TEMPLATES,
  TEMPLATE_FIELD_LABELS,
  type PolicyTemplate,
  type PolicyTemplateKey,
} from "./policy-templates";

const keys = {
  fulfillmentPolicyId: "fulfillment",
  paymentPolicyId: "payment",
  returnPolicyId: "returns",
  locationKey: "locations",
} as const;

type TemplateField = keyof typeof keys;

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

/** A template name that matched nothing (or matched more than one) policy. */
export interface UnmatchedPolicy {
  field: TemplateField;
  /** "Shipping policy", "Return policy", … */
  label: string;
  /** The name in the template that could not be resolved. */
  wanted: string;
  reason: "missing" | "ambiguous";
}

export interface TemplateResolution {
  ids: Partial<Record<TemplateField, string>>;
  unmatched: UnmatchedPolicy[];
}

/**
 * Turn one template's policy NAMES into the policy IDs in this eBay account.
 * Names are compared with punctuation, spacing and case removed. The shipping
 * origin is compared on the part before the "·" separator, because the option
 * label carries the zip and country too.
 */
export function resolvePolicyTemplate(
  options: AccountOptions,
  template: PolicyTemplateKey,
): TemplateResolution {
  const wanted: PolicyTemplate = POLICY_TEMPLATES[template];
  const ids: Partial<Record<TemplateField, string>> = {};
  const unmatched: UnmatchedPolicy[] = [];

  for (const field of Object.keys(keys) as TemplateField[]) {
    const target = normalize(wanted[field]);
    const matches = options[keys[field]].filter((o) =>
      field === "locationKey"
        ? normalize(o.name.split("·")[0]) === target
        : normalize(o.name) === target,
    );
    if (matches.length === 1) {
      ids[field] = matches[0].id;
    } else {
      unmatched.push({
        field,
        label: TEMPLATE_FIELD_LABELS[field],
        wanted: wanted[field],
        reason: matches.length === 0 ? "missing" : "ambiguous",
      });
    }
  }
  return { ids, unmatched };
}

/**
 * Fill in any policy the seller has not already chosen for this item. Existing
 * selections are left alone — this runs automatically when policies load, and
 * it must never quietly change something the seller picked by hand.
 */
export function applyShippingDefaults(
  current: Partial<ShippingSelection>,
  options: AccountOptions,
  template: PolicyTemplateKey = "non_media",
): Partial<ShippingSelection> {
  const { ids } = resolvePolicyTemplate(options, template);
  const next = { ...current };
  for (const field of Object.keys(keys) as TemplateField[]) {
    if (next[field]) continue;
    const id = ids[field];
    if (id) next[field] = id;
  }
  return next;
}

/**
 * Switch this item onto a template, replacing the four policy selections.
 * Used when the seller changes the template by hand, so it DOES overwrite.
 * Package weight and dimensions are left untouched.
 *
 * A field whose name resolved to nothing keeps its previous value rather than
 * being blanked — the caller surfaces `unmatched` so the seller can see which
 * policy name needs fixing.
 */
export function applyPolicyTemplate(
  current: Partial<ShippingSelection>,
  options: AccountOptions,
  template: PolicyTemplateKey,
): { shipping: Partial<ShippingSelection>; unmatched: UnmatchedPolicy[] } {
  const { ids, unmatched } = resolvePolicyTemplate(options, template);
  const next = { ...current };
  for (const field of Object.keys(keys) as TemplateField[]) {
    const id = ids[field];
    if (id) next[field] = id;
  }
  return { shipping: next, unmatched };
}
