import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FiEye } from "react-icons/fi";
import type { Swiper as SwiperType } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, A11y } from "swiper/modules";
import BookQuickViewModal from "../../components/BookQuickViewModal";
import type Book from "../../entities/Book";
import { formatPrice } from "../../utils/formatPrice";
import { resolveBookImage } from "../../utils/bookImages";
import { useCart } from "../../store/CartContext";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const FeaturedBooksSection = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalBook, setModalBook] = useState<Book | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [navReady, setNavReady] = useState(false);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const swiperRef = useRef<SwiperType | null>(null);
  const { addItem } = useCart();

  useEffect(() => {
    const swiper = swiperRef.current;
    if (!navReady || !swiper || !prevRef.current || !nextRef.current) return;

    swiper.params.navigation = {
      ...(swiper.params.navigation as object),
      prevEl: prevRef.current,
      nextEl: nextRef.current,
    };
    swiper.navigation.destroy();
    swiper.navigation.init();
    swiper.navigation.update();
  }, [navReady, books.length]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/books");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Book[] = await res.json();
        if (!cancelled) setBooks(data);
      } catch (err) {
        console.error("Failed to load books", err);
        if (!cancelled) setError("Couldn't load books right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const openQuickView = async (slug: string) => {
    if (!slug) return;
    setModalOpen(true);
    setModalLoading(true);
    setModalError(null);
    setModalBook(null);

    try {
      const res = await fetch(`/api/books/${slug}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Book = await res.json();
      setModalBook(data);
    } catch (err) {
      console.error("Failed to load book details", err);
      setModalError("Couldn't load book details right now.");
    } finally {
      setModalLoading(false);
    }
  };

  const closeQuickView = () => {
    setModalOpen(false);
    setModalBook(null);
    setModalError(null);
    setModalLoading(false);
  };

  if (loading)
    return (
      <section className="text-center mt-40 min-[1100px]:max-w-[1100px] mx-auto">
        Loading books...
      </section>
    );
  if (error)
    return (
      <section className="text-center mt-40 min-[1100px]:max-w-[1100px] mx-auto text-red-600">
        {error}
      </section>
    );
  if (books.length === 0) return null;

  return (
    <section className="text-center mt-40 min-[1100px]:max-w-[1100px] mx-auto">
      <header className="mb-11">
        <p className="headline-gradient text-lg font-text uppercase tracking-[0.05em] mb-4 font-bold">
          Inspiring Stories - Real-World Applications - Practical Lessons
        </p>

        <h2 className="font-heading uppercase text-5xl">
          DISCOVER YOUR NEXT GREAT READ
        </h2>
      </header>
      <div className="swiper_wrapper relative">
        <Swiper
          modules={[Navigation, Pagination, A11y]}
          navigation={{ prevEl: prevRef.current, nextEl: nextRef.current }}
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
            setNavReady(true);
          }}
          pagination={{
            clickable: true,
            bulletClass: "hero-dot",
            bulletActiveClass: "hero-dot-active",
            renderBullet: (index, className) =>
              `<button type="button" class="${className}" tabindex="0" aria-label="Go to slide ${
                index + 1
              }"></button>`,
          }}
          a11y={{
            enabled: true,
            paginationBulletMessage: "Go to slide {{index}}",
          }}
          rewind
          spaceBetween={30}
          breakpoints={{
            320: { slidesPerView: 1.3, centeredSlides: true },
            640: { slidesPerView: 2 },
            1024: { slidesPerView: 4 },
            1280: { slidesPerView: 5 },
          }}
          className="book_slider  relative"
        >
          {books.map((book) => (
            <SwiperSlide
              key={book.slug || book.id}
              className="flex flex-col items-center"
            >
              <div className="bs_item relative max-w-56 cursor-pointer">
                <div className="bs-img max-h-56 relative overflow-hidden">
                  <img
                    src={resolveBookImage(book.slug, book.cover_image_url)}
                    alt={book.title}
                    width={225}
                    height={225}
                    className="object-contain w-56 h-56"
                  />
                  <div className="bs-content-hover">
                    <div className="absolute z-20 top-7 right-5 group">
                      <div className="pointer-events-none absolute right-12 top-1/2 -translate-y-1/2 -translate-x-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200">
                        <div className="relative font-text bg-lantern text-white text-sm font-semibold px-3 py-1 rounded shadow-lg whitespace-nowrap">
                          Quick view
                          <span className="absolute top-1/2 right-[-7px] -translate-y-1/2 w-0 h-0 border-y-8 border-y-transparent border-l-8 border-l-lantern"></span>
                        </div>
                      </div>
                      <button
                        className="fi_eye cursor-pointer flex h-10 w-10 items-center justify-center rounded-full dark:bg-white bg-black shadow-md opacity-0 transition-all duration-200 hover:scale-110"
                        onClick={() => openQuickView(book.slug)}
                        aria-label={`Quick view ${book.title}`}
                      >
                        <FiEye className="dark:text-black text-white" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => addItem(book)}
                      className="book_cta absolute inline-block px-8 py-3 font-text font-bold uppercase tracking-[0.08em] bg-lantern text-white transition-all duration-300 hover:bg-lantern hover:text-white hover:shadow-[0_10px_30px_rgba(97,176,139,0.35)] dark:hover:bg-white dark:hover:text-black dark:hover:shadow-[0_0_0_.2rem_#fff] z-20 bottom-6 left-1/2 w-[95%] text-center"
                    >
                      Get Copy
                    </button>
                  </div>
                </div>
                <div className="bs-description mt-3">
                  <Link to={`/products/${book.slug}`} className="uppercase">
                    <h3 className="font-bold mb-2">{book.title}</h3>
                    <span>{formatPrice(book.price_cents, book.currency)}</span>
                  </Link>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
        {/* Swiper Navigation */}
        <div className="custom-nav">
          <button ref={prevRef} className="my-prev" aria-label="Previous">
            <span className="sr-only">Prev</span>
          </button>
          <button ref={nextRef} className="my-next" aria-label="Next">
            <span className="sr-only">Next</span>
          </button>
        </div>
      </div>
      <div className="text-left">
        <BookQuickViewModal
          open={modalOpen}
          book={modalBook}
          loading={modalLoading}
          error={modalError}
          onClose={closeQuickView}
        />
      </div>
    </section>
  );
};

export default FeaturedBooksSection;
