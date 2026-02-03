import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type Book from "../entities/Book";
import { resolveBookImage } from "../utils/bookImages";
import { formatPrice } from "../utils/formatPrice";
import { getPurchaseOptions } from "../utils/bookAvailability";
import HeroBanner from "../assets/images/books.jpg";

type BookFilter = "all" | "in-stock" | "external-only";
type SortOption = "featured" | "price-low" | "price-high" | "title-asc";

const ProductsCollectionPage = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<BookFilter>("all");
  const [sort, setSort] = useState<SortOption>("featured");

  useEffect(() => {
    let cancelled = false;

    async function loadBooks() {
      try {
        const response = await fetch("/api/books");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data: Book[] = await response.json();
        if (!cancelled) setBooks(data);
      } catch (err) {
        console.error("Failed to load books", err);
        if (!cancelled) setError("Couldn't load books right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadBooks();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const inStock = books.filter((book) => book.in_stock !== false).length;
    const externalOnly = books.filter(
      (book) => !getPurchaseOptions(book.slug).internalAvailable,
    ).length;

    return {
      total: books.length,
      inStock,
      externalOnly,
    };
  }, [books]);

  const filteredBooks = useMemo(() => {
    const next = books.filter((book) => {
      if (filter === "in-stock") return book.in_stock !== false;
      if (filter === "external-only")
        return !getPurchaseOptions(book.slug).internalAvailable;
      return true;
    });

    if (sort === "price-low") {
      next.sort((a, b) => a.price_cents - b.price_cents);
    } else if (sort === "price-high") {
      next.sort((a, b) => b.price_cents - a.price_cents);
    } else if (sort === "title-asc") {
      next.sort((a, b) => a.title.localeCompare(b.title));
    }

    return next;
  }, [books, filter, sort]);

  return (
    <section className="pt-24 pb-20">
      <header className="relative isolate overflow-hidden border-b border-white/10">
        <img
          src={HeroBanner}
          alt="Books collection"
          className="h-[250px] w-full object-cover sm:h-[300px]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/75" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(227,179,35,0.25),transparent_45%)]" />
        <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[1240px] px-4 pb-8 text-white">
          <p className="mb-2 text-sm">
            <Link to="/" className="text-white/70 transition hover:text-white">
              Home
            </Link>{" "}
            / <span className="text-white">Product Collection</span>
          </p>
          <h1 className="text-4xl font-heading uppercase sm:text-5xl">
            Product Collection
          </h1>
        </div>
      </header>

      <div className="mx-auto mt-10 grid max-w-[1240px] gap-8 px-4 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0f0f0f]">
          <h2 className="mb-4 text-2xl font-heading uppercase">Filters</h2>
          <div className="space-y-2 text-sm">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`w-full rounded border px-3 py-2 text-left transition ${
                filter === "all"
                  ? "border-lantern text-lantern"
                  : "border-slate-300 hover:border-slate-500 dark:border-slate-700 dark:hover:border-slate-500"
              }`}
            >
              All books ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setFilter("in-stock")}
              className={`w-full rounded border px-3 py-2 text-left transition ${
                filter === "in-stock"
                  ? "border-lantern text-lantern"
                  : "border-slate-300 hover:border-slate-500 dark:border-slate-700 dark:hover:border-slate-500"
              }`}
            >
              In stock ({stats.inStock})
            </button>
            <button
              type="button"
              onClick={() => setFilter("external-only")}
              className={`w-full rounded border px-3 py-2 text-left transition ${
                filter === "external-only"
                  ? "border-lantern text-lantern"
                  : "border-slate-300 hover:border-slate-500 dark:border-slate-700 dark:hover:border-slate-500"
              }`}
            >
              External only ({stats.externalOnly})
            </button>
          </div>
        </aside>

        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {loading ? "Loading books..." : `${filteredBooks.length} books`}
            </p>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-slate-600 dark:text-slate-300">Sort</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortOption)}
                className="rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-lantern dark:border-slate-700 dark:bg-[#0f0f0f]"
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="title-asc">Title: A to Z</option>
              </select>
            </label>
          </div>

          {error && <p className="text-red-500">{error}</p>}
          {!error && !loading && filteredBooks.length === 0 && (
            <p className="text-slate-500 dark:text-slate-400">
              No books found for this filter yet.
            </p>
          )}

          {!error && filteredBooks.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredBooks.map((book) => {
                const purchaseOptions = getPurchaseOptions(book.slug);
                return (
                  <Link
                    key={book.slug || book.id}
                    to={`/products/${book.slug}`}
                    className="group rounded-lg border border-slate-200 bg-white p-4 transition hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-[#0f0f0f]"
                  >
                    <div className="mb-4 flex aspect-square items-center justify-center rounded-md bg-slate-50 p-4 dark:bg-[#111]">
                      <img
                        src={resolveBookImage(book.slug, book.cover_image_url)}
                        alt={book.title}
                        className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]"
                      />
                    </div>
                    <h3 className="font-heading text-2xl uppercase leading-tight">
                      {book.title}
                    </h3>
                    <p className="mt-1 text-base font-semibold text-lantern">
                      {formatPrice(book.price_cents, book.currency)}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                      {purchaseOptions.internalAvailable
                        ? "Available in cart"
                        : purchaseOptions.note || "External purchase"}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ProductsCollectionPage;
