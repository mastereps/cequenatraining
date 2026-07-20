import type { SectionContent } from "../../features/content/types";
import { pickList, pickString } from "../../features/content/helpers";

type Card = { title: string; image_url?: string };

const DEFAULT_CARDS: Card[] = [
  { title: "Webinars", image_url: "" },
  { title: "Teacher Training", image_url: "" },
  { title: "Author Talks", image_url: "" },
  { title: "Consultancy", image_url: "" },
];

const WhatWeDoCard = ({ card }: { card: Card }) => {
  const hasImage = typeof card.image_url === "string" && card.image_url.trim() !== "";

  return (
    <article className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-white/[0.03]">
      {/* Image or placeholder */}
      {hasImage ? (
        <img
          src={card.image_url}
          alt={card.title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 dark:from-white/[0.06] dark:to-white/[0.02]">
          <span className="font-text text-xs uppercase tracking-[0.25em] text-slate-500 dark:text-white/40">
            Image coming soon
          </span>
        </div>
      )}

      {/* Dark gradient for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />

      {/* Title */}
      <h3 className="absolute inset-x-0 top-6 px-4 text-center font-heading text-xl uppercase tracking-wide text-white drop-shadow sm:text-2xl">
        {card.title}
      </h3>

      {/* Learn More pill */}
      <div className="absolute bottom-5 left-5">
        <span className="inline-block rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white shadow transition group-hover:bg-red-700">
          Learn More
        </span>
      </div>

      {/* Philippine-flag corner accent (bottom-right) */}
      <div className="pointer-events-none absolute bottom-0 right-0 h-16 w-16 overflow-hidden">
        <div className="absolute -bottom-8 -right-8 h-16 w-24 rotate-45 bg-blue-700" />
        <div className="absolute -bottom-12 -right-8 h-16 w-24 rotate-45 bg-red-600" />
      </div>
    </article>
  );
};

const WhatWeDo = ({ content }: { content?: SectionContent }) => {
  const heading = pickString(content, "heading", "What We Do");
  const cards = pickList<Card>(content, "cards", DEFAULT_CARDS);

  return (
    <section className="bg-slate-50 py-16 text-slate-900 dark:bg-black dark:text-white sm:py-20">
      <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-8">
        <h2 className="text-center font-heading text-4xl uppercase tracking-wide sm:text-5xl">
          {heading}
        </h2>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card, index) => (
            <WhatWeDoCard key={`${card.title}-${index}`} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhatWeDo;
