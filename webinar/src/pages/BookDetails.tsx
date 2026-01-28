import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type Book from "../entities/Book";
import { formatPrice } from "../utils/formatPrice";
import { resolveBookImage } from "../utils/bookImages";
import { useCart } from "../store/CartContext";

const clampQuantity = (value: number) => Math.min(99, Math.max(1, value));

const BookDetails = () => {
  const { slug } = useParams();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [related, setRelated] = useState<Book[]>([]);
  const [relatedError, setRelatedError] = useState<string | null>(null);
  const { addItem } = useCart();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!slug) return;
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/books/${slug}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Book = await res.json();
        if (!cancelled) setBook(data);
      } catch (err) {
        console.error("Failed to load book details", err);
        if (!cancelled) setError("Couldn't load this book right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    async function loadRelated() {
      if (!slug) return;
      setRelatedError(null);
      try {
        const res = await fetch(`/api/books/${slug}/related`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Book[] = await res.json();
        if (!cancelled) setRelated(data);
      } catch (err) {
        console.error("Failed to load related books", err);
        if (!cancelled)
          setRelatedError("Couldn't load related books right now.");
      }
    }
    loadRelated();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading)
    return (
      <section className="max-w-[1240px] mx-auto px-4 pt-32 pb-20">
        Loading book...
      </section>
    );
  if (error)
    return (
      <section className="max-w-[1240px] mx-auto px-4 pt-32 pb-20 text-red-600">
        {error}
      </section>
    );
  if (!book) return null;

  const imageUrl = resolveBookImage(
    book.slug,
    book.images?.[0] || book.cover_image_url
  );
  const description = book.details || book.short_description;

  return (
    <section className="max-w-[1240px] mx-auto px-4 pt-32 pb-20">
      <div className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        <Link to="/" className="hover:text-lantern">
          Home
        </Link>{" "}
        /{" "}
        <span className="text-slate-700 dark:text-slate-200">
          {book.title}
        </span>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0f0f0f]">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={book.title}
              className="max-h-[420px] w-full object-contain"
            />
          ) : (
            <div className="flex h-[420px] w-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
              No image
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-heading uppercase">{book.title}</h1>
            <p className="mt-3 text-2xl font-semibold text-lantern">
              {formatPrice(book.price_cents, book.currency)}
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Quantity
            </p>
            <div className="inline-flex items-center gap-2 rounded border border-slate-300 px-2 py-1 dark:border-slate-700">
              <button
                type="button"
                onClick={() =>
                  setQuantity((prev) => clampQuantity(prev - 1))
                }
                className="h-9 w-9 rounded text-lg text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                max={99}
                value={quantity}
                onChange={(event) =>
                  setQuantity(clampQuantity(Number(event.target.value || 1)))
                }
                className="h-9 w-14 bg-transparent text-center text-sm outline-none"
              />
              <button
                type="button"
                onClick={() =>
                  setQuantity((prev) => clampQuantity(prev + 1))
                }
                className="h-9 w-9 rounded text-lg text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                +
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => book && addItem(book, quantity)}
            className="w-full rounded border border-slate-900 py-3 text-sm font-semibold uppercase tracking-[0.2em] transition hover:bg-slate-900 hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black"
          >
            Add to cart
          </button>
        </div>
      </div>

      {description && (
        <div className="mt-12 border-t border-slate-200 pt-8 dark:border-slate-800">
          <h2 className="text-2xl font-heading uppercase mb-4">
            Product description
          </h2>
          <p className="text-slate-600 leading-relaxed dark:text-slate-300">
            {description}
          </p>
        </div>
      )}

      <div className="mt-16">
        <h2 className="text-3xl font-heading uppercase mb-6">
          You might also like
        </h2>
        {relatedError && (
          <p className="text-sm text-red-500 mb-4">{relatedError}</p>
        )}
        {!relatedError && related.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No related books found yet.
          </p>
        )}
        {related.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => (
              <Link
                key={item.slug || item.id}
                to={`/products/${item.slug}`}
                className="group rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-[#0f0f0f]"
              >
                <div className="mb-4 flex items-center justify-center">
                  {resolveBookImage(item.slug, item.cover_image_url) ? (
                    <img
                      src={resolveBookImage(item.slug, item.cover_image_url)}
                      alt={item.title}
                      className="h-36 w-36 object-contain"
                    />
                  ) : (
                    <div className="h-36 w-36 bg-slate-100 dark:bg-[#111]" />
                  )}
                </div>
                <h3 className="text-sm font-semibold uppercase tracking-wide">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {formatPrice(item.price_cents, item.currency)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default BookDetails;
