import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa6";
import type Book from "../entities/Book";
import { formatPrice } from "../utils/formatPrice";
import { bookGalleryBySlug, resolveBookImage } from "../utils/bookImages";
import { useCart } from "../store/CartContext";
import { getPurchaseOptions } from "../utils/bookAvailability";

type Props = {
  open: boolean;
  book: Book | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
};

const clampQuantity = (value: number) => Math.min(99, Math.max(1, value));

const BookQuickViewModal = ({ open, book, loading, error, onClose }: Props) => {
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isImageVisible, setIsImageVisible] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"next" | "prev">("next");
  const [hasInteracted, setHasInteracted] = useState(false);
  const { addItem } = useCart();
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    if (open) {
      setQuantity(1);
      setActiveImageIndex(0);
      setIsImageVisible(false);
      setSlideDirection("next");
      setHasInteracted(false);
    } else {
      setIsImageVisible(false);
      setHasInteracted(false);
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    }
  }, [open, book?.id]);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);
  // Make Quickview modal unscrollable FIXME:
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const localImages = book?.slug ? bookGalleryBySlug[book.slug] : undefined;
  const candidates = [
    ...(book?.slug ? [resolveBookImage(book.slug, book.cover_image_url)] : []),
    ...(book?.images ?? []),
    ...(localImages ?? []),
  ].filter(Boolean);
  const seen = new Set<string>();
  const images = candidates.filter((image) => {
    if (seen.has(image)) return false;
    seen.add(image);
    return true;
  });
  const hasMultipleImages = images.length > 1;
  const activeImageUrl = images[activeImageIndex];
  const description = book?.short_description || book?.details;
  const purchaseOptions = getPurchaseOptions(book?.slug);
  const slideOffsetClass = !hasInteracted
    ? ""
    : slideDirection === "next"
      ? "translate-x-6"
      : "-translate-x-6";
  const imageTransitionClass = hasInteracted
    ? "transition-all duration-300 ease-out"
    : "transition-all duration-300 ease-out";
  const imageOpacityClass = hasInteracted
    ? "opacity-100"
    : isImageVisible
      ? "opacity-100"
      : "opacity-0";
  const imageTranslateClass = hasInteracted
    ? isImageVisible
      ? "translate-x-0"
      : slideOffsetClass
    : "translate-x-0";

  const handleImageChange = (direction: "next" | "prev") => {
    if (images.length <= 1) return;
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
    setSlideDirection(direction);
    setHasInteracted(true);
    setIsImageVisible(false);
    setActiveImageIndex((prev) => {
      const nextIndex = direction === "next" ? prev + 1 : prev - 1;
      return (nextIndex + images.length) % images.length;
    });
    transitionTimeoutRef.current = setTimeout(() => {
      setIsImageVisible(true);
      transitionTimeoutRef.current = null;
    }, 20);
  };

  useEffect(() => {
    if (!open || !activeImageUrl || hasInteracted) return;
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    transitionTimeoutRef.current = setTimeout(() => {
      setIsImageVisible(true);
      transitionTimeoutRef.current = null;
    }, 20);
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }
    };
  }, [open, activeImageUrl, hasInteracted]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-4xl rounded-lg bg-white text-black shadow-2xl dark:bg-[#1a1a1a] dark:text-white text-left"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quick view"
          className="absolute cursor-pointer right-4 top-4 text-2xl leading-none text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
        >
          ×
        </button>

        <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
          <div className="group relative flex items-center justify-center overflow-hidden">
            {hasMultipleImages && (
              <button
                type="button"
                aria-label="Previous image"
                onClick={() => handleImageChange("prev")}
                className="absolute left-4 z-30 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md opacity-0 -translate-x-7 transition-all duration-300 ease-out pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto hover:opacity-100 hover:translate-x-0 hover:pointer-events-auto hover:bg-slate-100 dark:border-slate-700 dark:bg-[#111] dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <FaArrowLeft className="text-[16px]" aria-hidden="true" />
              </button>
            )}
            {activeImageUrl ? (
              <img
                src={activeImageUrl}
                alt={book?.title || "Book cover"}
                className={` w-88 h-88  object-contain ${imageTransitionClass} ${imageOpacityClass} ${imageTranslateClass}`}
              />
            ) : (
              <div className="flex  w-88 h-88  items-center justify-center rounded bg-slate-100 text-sm text-slate-500 dark:bg-[#111] dark:text-slate-400">
                No image
              </div>
            )}
            {hasMultipleImages && (
              <button
                type="button"
                aria-label="Next image"
                onClick={() => handleImageChange("next")}
                className="absolute right-4 z-30 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md opacity-0 translate-x-7 transition-all duration-300 ease-out pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto hover:opacity-100 hover:translate-x-0 hover:pointer-events-auto hover:bg-slate-100 dark:border-slate-700 dark:bg-[#111] dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <FaArrowRight className="text-[16px]" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="space-y-3 p-8">
            {loading && <p className="text-sm text-slate-500">Loading...</p>}
            {error && <p className="text-sm text-red-500">{error}</p>}
            {!loading && !error && book && (
              <>
                <div>
                  <h3 className="text-2xl font-heading uppercase">
                    {book.title}
                  </h3>
                  <p className="mt-2 text-lg font-semibold text-lantern">
                    {formatPrice(book.price_cents, book.currency)}
                  </p>
                </div>
                {description && (
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {description}
                  </p>
                )}
                {!purchaseOptions.internalAvailable && (
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-500">
                    {purchaseOptions.note || "External purchase only."}
                  </p>
                )}
                <div className="pt-4">
                  <Link
                    to={`/products/${book.slug}`}
                    className=" underline text-sm  tracking-[0.08em] text-black dark:text-white hover:brightness-110"
                    onClick={onClose}
                  >
                    View details
                  </Link>
                </div>
                {purchaseOptions.internalAvailable && (
                  <div className="mt-4">
                  <p className="mb-2    text-slate-500 dark:text-slate-400">
                    Quantity
                  </p>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="inline-flex items-center gap-2 rounded border border-slate-300 px-2 py-1 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity((prev) => clampQuantity(prev - 1))
                        }
                        disabled={quantity <= 1}
                        className={` h-8 w-8 rounded text-lg text-slate-700 dark:text-slate-200 ${
                          quantity <= 1
                            ? "cursor-not-allowed opacity-50"
                            : "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={quantity}
                        onChange={(event) =>
                          setQuantity(
                            clampQuantity(Number(event.target.value || 1)),
                          )
                        }
                        className="h-8 w-12 bg-transparent text-center text-sm outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity((prev) => clampQuantity(prev + 1))
                        }
                        className="h-8 cursor-pointer w-8 rounded text-lg text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => book && addItem(book, quantity)}
                      className="min-w-[160px] flex-1 cursor-pointer rounded bg-lantern px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-black transition hover:brightness-110"
                    >
                      Add to cart
                    </button>
                  </div>
                  </div>
                )}
                {purchaseOptions.externalLinks.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      Buy on
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {purchaseOptions.externalLinks.map((link) => (
                        <a
                          key={link.url}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          {link.label}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookQuickViewModal;
