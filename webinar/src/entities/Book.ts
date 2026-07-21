import type { ExternalLink } from "../utils/bookAvailability";

export default interface Book {
  id: number;
  slug: string;
  title: string;
  price_cents: number;
  currency: string;
  cover_image_url: string;
  short_description?: string | null;
  details?: string | null;
  images?: string[];
  in_stock?: boolean;
  is_active?: boolean;
  internal_purchase_enabled?: boolean;
  external_links?: ExternalLink[];
}
