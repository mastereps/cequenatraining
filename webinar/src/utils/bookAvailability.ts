import { CART_CHECKOUT_ENABLED } from "../config/commerce";

export type ExternalLink = {
  label: string;
  url: string;
  region?: "local" | "international";
  channel?: "marketplace" | "publisher-direct";
};

/** The fields of a book that decide how it can be bought. */
type PurchasableBook = {
  external_links?: ExternalLink[] | null;
  internal_purchase_enabled?: boolean;
};

export type PurchaseMode =
  | "cart"
  | "external-local-only"
  | "external-international-only"
  | "external-mixed"
  | "external-publisher-direct"
  | "external-unlisted";

const resolvePurchaseMode = (
  internalAvailable: boolean,
  externalLinks: ExternalLink[],
): PurchaseMode => {
  if (internalAvailable) return "cart";
  if (externalLinks.length === 0) return "external-unlisted";

  const hasLocal = externalLinks.some((link) => link.region === "local");
  const hasInternational = externalLinks.some(
    (link) => link.region === "international",
  );
  const publisherDirectOnly = externalLinks.every(
    (link) => link.channel === "publisher-direct",
  );

  if (publisherDirectOnly && hasInternational && !hasLocal) {
    return "external-publisher-direct";
  }
  if (hasLocal && hasInternational) return "external-mixed";
  if (hasInternational) return "external-international-only";
  if (hasLocal) return "external-local-only";
  return "external-unlisted";
};

const purchaseModeLabel = (mode: PurchaseMode) => {
  switch (mode) {
    case "cart":
      return "Available in cart.";
    case "external-local-only":
      return "Available on local online stores.";
    case "external-international-only":
      return "Available internationally only.";
    case "external-mixed":
      return "Available locally and internationally.";
    case "external-publisher-direct":
      return "Publisher direct (international).";
    default:
      return "External purchase.";
  }
};

/**
 * Store links and the per-book cart opt-out come from the API (admin manages
 * them under /admin/books). A book with neither reads as "External purchase."
 */
export const getPurchaseOptions = (book?: PurchasableBook | null) => {
  const externalLinks = book?.external_links ?? [];
  const internalAvailable =
    CART_CHECKOUT_ENABLED && (book?.internal_purchase_enabled ?? true);
  const mode = resolvePurchaseMode(internalAvailable, externalLinks);
  const isInternationalOnly =
    mode === "external-international-only" ||
    mode === "external-publisher-direct";

  return {
    internalAvailable,
    externalLinks,
    mode,
    isInternationalOnly,
    note: purchaseModeLabel(mode),
  };
};
