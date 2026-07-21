import { useEffect, useRef, useState } from "react";
import { FiStar } from "react-icons/fi";
import type { Swiper as SwiperType } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, A11y } from "swiper/modules";
import type { SectionContent } from "../../features/content/types";
import { pickList, pickString } from "../../features/content/helpers";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

type Testimonial = { quote: string; name: string };

const DEFAULT_TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "The webinars are informative, well-organized, and easy to follow. I always leave each session with practical insights I can apply in teaching and research.",
    name: "Angela Marie",
  },
  {
    quote:
      "I love how the platform combines learning and resources in one place. After attending a webinar, I was also able to purchase books that helped me deepen my understanding of the topic.",
    name: "Mark Anthony",
  },
  {
    quote:
      "The speakers are knowledgeable, and the discussions are engaging. The recommended books are also worth buying because they are relevant, credible, and useful for professional growth.",
    name: "Sofia Elaine",
  },
  {
    quote:
      "This platform is a great space for continuous learning. The webinars are enriching, and the book collection offers valuable materials for educators, researchers, and lifelong learners.",
    name: "Daniel Joshua",
  },
];

const Testimonials = ({ content }: { content?: SectionContent }) => {
  const heading = pickString(content, "heading", "Testimonials");
  const testimonials = pickList<Testimonial>(content, "testimonials", DEFAULT_TESTIMONIALS);

  const [navReady, setNavReady] = useState(false);
  // Swiper locks itself when every slide already fits; the arrows would be dead controls.
  const [locked, setLocked] = useState(false);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const paginationRef = useRef<HTMLDivElement>(null);
  const swiperRef = useRef<SwiperType | null>(null);

  useEffect(() => {
    const swiper = swiperRef.current;
    if (
      !navReady ||
      !swiper ||
      !prevRef.current ||
      !nextRef.current ||
      !paginationRef.current
    ) {
      return;
    }

    swiper.params.navigation = {
      ...(swiper.params.navigation as object),
      prevEl: prevRef.current,
      nextEl: nextRef.current,
    };
    swiper.params.pagination = {
      ...(typeof swiper.params.pagination === "object" ? swiper.params.pagination : {}),
      el: paginationRef.current,
      clickable: true,
    };
    swiper.navigation.destroy();
    swiper.navigation.init();
    swiper.navigation.update();
    swiper.pagination.destroy();
    swiper.pagination.init();
    swiper.pagination.render();
    swiper.pagination.update();
  }, [navReady, testimonials.length, locked]);

  return (
    <section className="text-center mt-40 min-[1100px]:max-w-[1100px] mx-auto px-3 sm:px-4">
      <header className="mb-11">
        <h2 className="font-heading uppercase text-5xl">{heading}</h2>
      </header>

      {/* book_slider on the wrapper so the shared dot styles reach the pagination. */}
      <div className="swiper_wrapper book_slider relative">
        <Swiper
          modules={[Navigation, Pagination, A11y]}
          navigation={{ prevEl: prevRef.current, nextEl: nextRef.current }}
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
            setNavReady(true);
            setLocked(swiper.isLocked);
          }}
          onLock={() => setLocked(true)}
          onUnlock={() => setLocked(false)}
          pagination={{
            el: paginationRef.current,
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
          spaceBetween={24}
          centerInsufficientSlides
          breakpoints={{
            320: { slidesPerView: 1 },
            640: { slidesPerView: 2 },
            1024: { slidesPerView: 3 },
          }}
          // Swiper clips overflow, so the hover lift needs vertical room or the
          // card's top border gets cut off.
          className="!py-5"
        >
          {testimonials.map((testimonial, index) => (
            <SwiperSlide key={`${testimonial.name}-${index}`} className="h-auto">
              <article
                className="flex h-full flex-col items-center border border-black/15 bg-white px-6 py-8
                  text-center shadow-sm transition-all duration-300 hover:-translate-y-1
                  hover:border-lantern/60 hover:shadow-[0_10px_30px_rgba(97,176,139,0.18)]
                  dark:border-white/15 dark:bg-transparent dark:shadow-none dark:hover:border-lantern/60"
              >
                <div className="flex gap-1 text-lantern" aria-label="Rated 5 out of 5">
                  {Array.from({ length: 5 }, (_, star) => (
                    <FiStar key={star} aria-hidden className="h-5 w-5 fill-current" />
                  ))}
                </div>

                <span aria-hidden className="mt-4 font-heading text-5xl leading-none text-lantern">
                  &ldquo;
                </span>

                <p className="mt-2 text-base leading-relaxed text-slate-600 dark:text-white/75">
                  {testimonial.quote}
                </p>

                <span aria-hidden className="my-6 block h-px w-10 bg-lantern/60" />

                <h3 className="font-text text-lg font-bold uppercase tracking-[0.04em]">
                  {testimonial.name}
                </h3>
              </article>
            </SwiperSlide>
          ))}
        </Swiper>

        {!locked && (
          <div className="book-slider-controls">
            <button ref={prevRef} className="my-prev" aria-label="Previous">
              <span className="sr-only">Prev</span>
            </button>
            <div ref={paginationRef} className="swiper-pagination" />
            <button ref={nextRef} className="my-next" aria-label="Next">
              <span className="sr-only">Next</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default Testimonials;
