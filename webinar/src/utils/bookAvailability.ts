import { CART_CHECKOUT_ENABLED } from "../config/commerce";

type ExternalLink = {
  label: string;
  url: string;
  region?: "local" | "international";
  channel?: "marketplace" | "publisher-direct";
};

type PurchaseOptions = {
  internalAvailable?: boolean;
  externalLinks?: ExternalLink[];
  note?: string;
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

const PURCHASE_OPTIONS_BY_SLUG: Record<string, PurchaseOptions> = {
  "beyond-the-ordeal-book-of-poems": {
    externalLinks: [
      {
        label: "Lazada",
        url: "https://www.lazada.com.ph/products/pdp-i5336173197.html?spm=a2o4l.searchlist.list.2.96a81453yd5QEl",
        region: "local",
        channel: "marketplace",
      },
      {
        label: "Amazon",
        url: "https://www.amazon.com/Beyond-Ordeal-poems-Maria-Ceque%C3%B1a-ebook/dp/B0CVW135KM",
        region: "international",
        channel: "marketplace",
      },
    ],
  },
  "metacognitive-strategy-use-and-curriculum-design": {
    internalAvailable: false,
    externalLinks: [
      {
        label: "Ethics Press",
        url: "https://ethicspress.com/products/metacognitive-strategy-use-and-curriculum-design",
        region: "international",
        channel: "publisher-direct",
      },
    ],
  },
};

export const getPurchaseOptions = (slug?: string) => {
  const baseInternalAvailable = CART_CHECKOUT_ENABLED;

  if (!slug) {
    const mode = resolvePurchaseMode(baseInternalAvailable, []);
    return {
      internalAvailable: baseInternalAvailable,
      externalLinks: [],
      mode,
      isInternationalOnly: false,
      note: purchaseModeLabel(mode),
    };
  }

  const options = PURCHASE_OPTIONS_BY_SLUG[slug];
  const internalAvailable =
    baseInternalAvailable && (options?.internalAvailable ?? true);
  const externalLinks = options?.externalLinks ?? [];
  const mode = resolvePurchaseMode(internalAvailable, externalLinks);
  const isInternationalOnly =
    mode === "external-international-only" ||
    mode === "external-publisher-direct";

  return {
    internalAvailable,
    externalLinks,
    mode,
    isInternationalOnly,
    note: options?.note ?? purchaseModeLabel(mode),
  };
};
