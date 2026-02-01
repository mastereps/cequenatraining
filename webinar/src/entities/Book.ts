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
}
