type ExternalLink = {
  label: string;
  url: string;
};

type PurchaseOptions = {
  internalAvailable?: boolean;
  externalLinks?: ExternalLink[];
  note?: string;
};

const PURCHASE_OPTIONS_BY_SLUG: Record<string, PurchaseOptions> = {
  "beyond-the-ordeal-book-of-poems": {
    externalLinks: [
      {
        label: "Lazada",
        url: "https://www.lazada.com.ph/products/pdp-i5336173197.html?spm=a2o4l.searchlist.list.2.96a81453yd5QEl",
      },
      {
        label: "Amazon",
        url: "https://www.amazon.com/Beyond-Ordeal-poems-Maria-Ceque%C3%B1a-ebook/dp/B0CVW135KM",
      },
    ],
  },
  "metacognitive-strategy-use-and-curriculum-design": {
    internalAvailable: false,
    note: "Available internationally only.",
    externalLinks: [
      {
        label: "Ethics Press",
        url: "https://ethicspress.com/products/metacognitive-strategy-use-and-curriculum-design",
      },
    ],
  },
};

export const getPurchaseOptions = (slug?: string) => {
  if (!slug) {
    return {
      internalAvailable: true,
      externalLinks: [],
      note: null as string | null,
    };
  }

  const options = PURCHASE_OPTIONS_BY_SLUG[slug];
  return {
    internalAvailable: options?.internalAvailable ?? true,
    externalLinks: options?.externalLinks ?? [],
    note: options?.note ?? null,
  };
};
