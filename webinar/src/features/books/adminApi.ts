import type Book from "../../entities/Book";

/** Everything the Books editor can send. `external_links` replaces the whole set. */
export type BookInput = {
  slug?: string;
  title: string;
  price_cents: number;
  currency: string;
  cover_image_url: string;
  short_description?: string | null;
  details?: string | null;
  in_stock: boolean;
  internal_purchase_enabled: boolean;
  external_links: NonNullable<Book["external_links"]>;
};

const getErrorMessage = async (res: Response) => {
  try {
    const payload = (await res.json()) as { error?: string };
    return payload.error || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
};

const request = async (url: string, init?: RequestInit): Promise<Book> => {
  const res = await fetch(url, { credentials: "include", ...init });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }
  const payload = (await res.json()) as { book: Book };
  return payload.book;
};

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

/** Admin: every book, archived ones included. */
export const fetchAdminBooks = async (): Promise<Book[]> => {
  const res = await fetch("/api/admin/books", { credentials: "include" });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }
  const payload = (await res.json()) as { books: Book[] };
  return payload.books;
};

export const createBook = (input: BookInput) =>
  request("/api/admin/books", jsonInit("POST", input));

export const updateBook = (id: number, input: Partial<BookInput>) =>
  request(`/api/admin/books/${id}`, jsonInit("PATCH", input));

/** Archives the book (is_active = false); nothing is deleted. */
export const archiveBook = (id: number) =>
  request(`/api/admin/books/${id}`, { method: "DELETE" });

export const restoreBook = (id: number) =>
  request(`/api/admin/books/${id}/restore`, { method: "POST" });

/** Uploads a cover image, returns its served url. */
export const uploadBookCover = async (file: File): Promise<string> => {
  const body = new FormData();
  body.append("image", file);
  const res = await fetch("/api/admin/books/uploads", {
    method: "POST",
    credentials: "include",
    body,
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }
  const payload = (await res.json()) as { url: string };
  return payload.url;
};
