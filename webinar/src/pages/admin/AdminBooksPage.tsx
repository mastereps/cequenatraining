import { useEffect, useMemo, useState } from "react";
import type Book from "../../entities/Book";
import type { ExternalLink } from "../../utils/bookAvailability";
import { formatPrice } from "../../utils/formatPrice";
import { resolveBookImage } from "../../utils/bookImages";
import {
  archiveBook,
  createBook,
  fetchAdminBooks,
  restoreBook,
  updateBook,
  uploadBookCover,
  type BookInput,
} from "../../features/books/adminApi";
import ConfirmDialog from "./ConfirmDialog";

type FormState = {
  title: string;
  slug: string;
  price: string;
  currency: string;
  cover_image_url: string;
  short_description: string;
  details: string;
  in_stock: boolean;
  internal_purchase_enabled: boolean;
  external_links: ExternalLink[];
};

const EMPTY_FORM: FormState = {
  title: "",
  slug: "",
  price: "",
  currency: "PHP",
  cover_image_url: "",
  short_description: "",
  details: "",
  in_stock: true,
  internal_purchase_enabled: true,
  external_links: [],
};

const toForm = (book: Book): FormState => ({
  title: book.title,
  slug: book.slug,
  price: (book.price_cents / 100).toFixed(2),
  currency: book.currency,
  cover_image_url: book.cover_image_url,
  short_description: book.short_description || "",
  details: book.details || "",
  in_stock: book.in_stock !== false,
  internal_purchase_enabled: book.internal_purchase_enabled !== false,
  external_links: book.external_links ?? [],
});

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-lantern dark:border-white/10 dark:bg-white/5";
const labelClass = "mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500";

const AdminBooksPage = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // null = the form is closed, 0 = adding, >0 = editing that book id.
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [confirming, setConfirming] = useState<Book | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setBooks(await fetchAdminBooks());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load books.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  // Success messages clear themselves; errors stay until dismissed or replaced.
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [message]);

  const visibleBooks = useMemo(
    () => books.filter((book) => showArchived || book.is_active !== false),
    [books, showArchived],
  );
  const archivedCount = books.filter((book) => book.is_active === false).length;

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId(0);
    setError(null);
    setMessage(null);
  };

  const openEdit = (book: Book) => {
    setForm(toForm(book));
    setEditingId(book.id);
    setError(null);
    setMessage(null);
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const setLink = (index: number, patch: Partial<ExternalLink>) =>
    setForm((current) => ({
      ...current,
      external_links: current.external_links.map((link, i) =>
        i === index ? { ...link, ...patch } : link,
      ),
    }));

  const addLink = () =>
    setForm((current) => ({
      ...current,
      external_links: [
        ...current.external_links,
        { label: "", url: "", region: "local", channel: "marketplace" },
      ],
    }));

  const removeLink = (index: number) =>
    setForm((current) => ({
      ...current,
      external_links: current.external_links.filter((_, i) => i !== index),
    }));

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      setField("cover_image_url", await uploadBookCover(file));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) {
      setError("Enter a price like 499 or 499.50.");
      return;
    }

    const payload: BookInput = {
      title: form.title,
      slug: form.slug,
      price_cents: Math.round(price * 100),
      currency: form.currency,
      cover_image_url: form.cover_image_url,
      short_description: form.short_description,
      details: form.details,
      in_stock: form.in_stock,
      internal_purchase_enabled: form.internal_purchase_enabled,
      external_links: form.external_links,
    };

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const saved =
        editingId && editingId > 0
          ? await updateBook(editingId, payload)
          : await createBook(payload);
      setBooks((current) =>
        current.some((book) => book.id === saved.id)
          ? current.map((book) => (book.id === saved.id ? saved : book))
          : [...current, saved],
      );
      setEditingId(null);
      setMessage(`Saved "${saved.title}".`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save the book.");
    } finally {
      setSaving(false);
    }
  };

  // Archiving is the destructive direction, so it asks first; restoring does not.
  const requestArchive = (book: Book) => {
    if (book.is_active !== false) {
      setConfirming(book);
      return;
    }
    void handleArchive(book);
  };

  const handleArchive = async (book: Book) => {
    const archiving = book.is_active !== false;

    setBusyId(book.id);
    setError(null);
    setMessage(null);
    try {
      const saved = archiving ? await archiveBook(book.id) : await restoreBook(book.id);
      setBooks((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      setMessage(`"${saved.title}" was ${archiving ? "archived" : "restored"}.`);
    } catch (archiveError) {
      setError(
        archiveError instanceof Error ? archiveError.message : "Unable to update the book.",
      );
    } finally {
      setBusyId(null);
      setConfirming(null);
    }
  };

  return (
    <main className="mx-auto max-w-[1100px]">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl uppercase">Books</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Add, edit, and archive the titles shown on the Products page.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {archivedCount > 0 && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(event) => setShowArchived(event.target.checked)}
              />
              Show archived ({archivedCount})
            </label>
          )}
          <button
            type="button"
            onClick={openAdd}
            className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Add book
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 animate-[admin-pop-in_180ms_ease-out] dark:text-red-300">
          <span aria-hidden="true" className="text-base leading-none">
            ⚠
          </span>
          <p className="flex-1">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
            className="cursor-pointer leading-none opacity-60 transition hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}
      {message && (
        <div
          role="status"
          className="mb-4 flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700 animate-[admin-pop-in_180ms_ease-out] dark:text-emerald-300"
        >
          <span aria-hidden="true" className="text-base leading-none">
            ✓
          </span>
          {message}
        </div>
      )}

      {editingId !== null && (
        <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0b1220]">
          <h3 className="mb-4 text-lg font-semibold">
            {editingId > 0 ? "Edit book" : "New book"}
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="book-title">
                Title
              </label>
              <input
                id="book-title"
                className={inputClass}
                value={form.title}
                onChange={(event) => setField("title", event.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="book-slug">
                Url slug
              </label>
              <input
                id="book-slug"
                className={inputClass}
                placeholder="left blank, built from the title"
                value={form.slug}
                onChange={(event) => setField("slug", event.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="book-price">
                Price
              </label>
              <input
                id="book-price"
                className={inputClass}
                inputMode="decimal"
                placeholder="499.00"
                value={form.price}
                onChange={(event) => setField("price", event.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="book-currency">
                Currency
              </label>
              <input
                id="book-currency"
                className={inputClass}
                maxLength={3}
                value={form.currency}
                onChange={(event) => setField("currency", event.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className={labelClass} htmlFor="book-cover">
              Cover image
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {form.cover_image_url && (
                <img
                  src={form.cover_image_url}
                  alt=""
                  className="h-20 w-16 rounded object-cover"
                />
              )}
              <input
                id="book-cover"
                className={`${inputClass} flex-1`}
                placeholder="/images/cover.png"
                value={form.cover_image_url}
                onChange={(event) => setField("cover_image_url", event.target.value)}
              />
              <label className="cursor-pointer rounded border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-white/10">
                {uploading ? "Uploading…" : "Upload"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleUpload(file);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>

          <div className="mt-4">
            <label className={labelClass} htmlFor="book-short">
              Short description
            </label>
            <input
              id="book-short"
              className={inputClass}
              value={form.short_description}
              onChange={(event) => setField("short_description", event.target.value)}
            />
          </div>

          <div className="mt-4">
            <label className={labelClass} htmlFor="book-details">
              Details
            </label>
            <textarea
              id="book-details"
              rows={4}
              className={inputClass}
              value={form.details}
              onChange={(event) => setField("details", event.target.value)}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={form.in_stock}
                onChange={(event) => setField("in_stock", event.target.checked)}
              />
              In stock
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={form.internal_purchase_enabled}
                onChange={(event) =>
                  setField("internal_purchase_enabled", event.target.checked)
                }
              />
              Sellable through the site cart
            </label>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <span className={labelClass}>Where to buy</span>
              <button
                type="button"
                onClick={addLink}
                className="rounded border border-slate-300 px-3 py-1 text-xs font-semibold dark:border-white/10"
              >
                Add link
              </button>
            </div>
            {form.external_links.length === 0 ? (
              <p className="text-sm text-slate-500">
                No store links. The Products page will read "External purchase."
              </p>
            ) : (
              <div className="space-y-2">
                {form.external_links.map((link, index) => (
                  <div key={index} className="flex flex-wrap items-center gap-2">
                    <input
                      className={`${inputClass} w-32`}
                      placeholder="Lazada"
                      aria-label="Store name"
                      value={link.label}
                      onChange={(event) => setLink(index, { label: event.target.value })}
                    />
                    <input
                      className={`${inputClass} min-w-[200px] flex-1`}
                      placeholder="https://…"
                      aria-label="Store url"
                      value={link.url}
                      onChange={(event) => setLink(index, { url: event.target.value })}
                    />
                    <select
                      className={`${inputClass} w-36`}
                      aria-label="Region"
                      value={link.region ?? "local"}
                      onChange={(event) =>
                        setLink(index, { region: event.target.value as ExternalLink["region"] })
                      }
                    >
                      <option value="local">Local</option>
                      <option value="international">International</option>
                    </select>
                    <select
                      className={`${inputClass} w-40`}
                      aria-label="Channel"
                      value={link.channel ?? "marketplace"}
                      onChange={(event) =>
                        setLink(index, {
                          channel: event.target.value as ExternalLink["channel"],
                        })
                      }
                    >
                      <option value="marketplace">Marketplace</option>
                      <option value="publisher-direct">Publisher direct</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeLink(index)}
                      aria-label={`Remove ${link.label || "link"}`}
                      className="px-2 text-slate-400 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="rounded border border-slate-300 px-5 py-2 text-sm font-semibold dark:border-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded bg-emerald-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save book"}
            </button>
          </div>
        </section>
      )}

      {loading ? (
        <p>Loading books…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0b1220]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.08em] text-slate-500 dark:border-white/10">
              <tr>
                <th className="px-4 py-3">Book</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Links</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleBooks.map((book) => {
                const archived = book.is_active === false;
                return (
                  <tr
                    key={book.id}
                    className={`border-b border-slate-100 last:border-0 dark:border-white/5 ${
                      archived ? "opacity-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={resolveBookImage(book.slug, book.cover_image_url)}
                          alt=""
                          className="h-14 w-10 rounded object-cover"
                        />
                        <div>
                          <p className="font-semibold">{book.title}</p>
                          <p className="text-xs text-slate-400">/products/{book.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{formatPrice(book.price_cents, book.currency)}</td>
                    <td className="px-4 py-3">
                      {archived ? "Archived" : book.in_stock === false ? "Out of stock" : "In stock"}
                    </td>
                    <td className="px-4 py-3">{book.external_links?.length ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(book)}
                          className="cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold transition hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => requestArchive(book)}
                          disabled={busyId === book.id}
                          className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                            archived
                              ? "border-slate-300 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
                              : "border-red-500/30 text-red-600 hover:bg-red-500/10 dark:text-red-400"
                          }`}
                        >
                          {archived ? "Restore" : "Archive"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {confirming && (
        <ConfirmDialog
          title={`Archive "${confirming.title}"?`}
          body="It disappears from the storefront right away. Past orders keep it, and you can restore it later from this page."
          confirmLabel="Archive book"
          busy={busyId === confirming.id}
          onConfirm={() => void handleArchive(confirming)}
          onCancel={() => setConfirming(null)}
        />
      )}
    </main>
  );
};

export default AdminBooksPage;
