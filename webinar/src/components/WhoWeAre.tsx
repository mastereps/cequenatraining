import type { SectionContent } from "../features/content/types";
import { pickList, pickString } from "../features/content/helpers";

type Milestone = {
  no: string;
  title: string;
  detail: string;
  highlight?: boolean;
};

// Career timeline for Maria B. Cequeña. Years intentionally omitted —
// swap in confirmed dates in place of the `no` labels if/when available.
const MILESTONES: Milestone[] = [
  {
    no: "01",
    title: "Cum Laude",
    detail: "BSE English, Pasig Catholic College",
  },
  {
    no: "02",
    title: "MA Literature",
    detail: "Ateneo de Manila University",
  },
  {
    no: "03",
    title: "PhD (Reading Education)",
    detail: "UP Diliman University",
  },
  {
    no: "04",
    title: "Educator",
    detail: "English & research at De La Salle, UST, National University",
  },
  {
    no: "05",
    title: "Published Researcher",
    detail: "ESL writing & reading comprehension; Scopus journal reviewer",
  },
  {
    no: "06",
    title: "Academic Dept. Head",
    detail: "Catholic Filipino Academy Homeschool",
  },
  {
    no: "07",
    title: "Established",
    detail: "Founder & President, Cequeña Training and Consultancy OPC",
    highlight: true,
  },
  {
    no: "08",
    title: "Educator-Author Today",
    detail: "7 books · 1,000+ teachers trained · 32 webinars",
  },
];

const TimelineCard = ({ item }: { item: Milestone }) => (
  <div
    className={
      item.highlight
        ? "flex h-full flex-col border border-lantern bg-lantern px-5 py-5 text-black"
        : "flex h-full flex-col border border-slate-300 bg-white px-5 py-5 text-slate-900 shadow-sm dark:border-white/20 dark:bg-white/[0.03] dark:text-white dark:shadow-none"
    }
  >
    <h3 className="font-heading text-xl uppercase leading-tight sm:text-2xl">
      {item.title}
    </h3>
    <p
      className={
        item.highlight
          ? "mt-2 font-text text-sm leading-relaxed text-black/80"
          : "mt-2 font-text text-sm leading-relaxed text-slate-600 dark:text-white/70"
      }
    >
      {item.detail}
    </p>
  </div>
);

const NumberBadge = ({ value }: { value: string }) => (
  <span className="font-heading text-3xl text-slate-900 dark:text-white sm:text-4xl">
    {value}
  </span>
);

const WhoWeAre = ({ content }: { content?: SectionContent }) => {
  const heading = pickString(content, "heading", "Who We Are");
  const subheading = pickString(content, "subheading", "A Brief Story About Maria Cequeña");
  const milestones = pickList<Milestone>(content, "milestones", MILESTONES);
  const topRow = milestones.slice(0, 4); // 01 → 04
  const bottomRow = milestones.slice(4).reverse(); // visual L→R: 08, 07, 06, 05

  return (
    <section className="bg-slate-50 py-16 text-slate-900 dark:bg-black dark:text-white sm:py-20">
      <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="font-heading text-5xl uppercase tracking-wide text-lantern sm:text-6xl">
            {heading}
          </h2>
          <p className="mt-2 font-text text-lg tracking-wide text-slate-600 dark:text-white/70 sm:text-xl">
            {subheading}
          </p>
        </div>

        {/* ---------- Desktop: zig-zag timeline (lg and up) ---------- */}
        <div className="mt-12 hidden lg:block">
          {/* Top row: numbers above cards */}
          <div className="grid grid-cols-4 gap-6">
            {topRow.map((item) => (
              <div key={item.no} className="flex flex-col items-center gap-3">
                <NumberBadge value={item.no} />
                <span className="h-3 w-3 rounded-full border-2 border-lantern bg-slate-50 dark:bg-black" />
                <TimelineCard item={item} />
              </div>
            ))}
          </div>

          {/* Connecting rail */}
          <div className="my-6 h-px w-full bg-lantern/60" />

          {/* Bottom row: cards above numbers */}
          <div className="grid grid-cols-4 gap-6">
            {bottomRow.map((item) => (
              <div key={item.no} className="flex flex-col items-center gap-3">
                <TimelineCard item={item} />
                <span className="h-3 w-3 rounded-full border-2 border-lantern bg-slate-50 dark:bg-black" />
                <NumberBadge value={item.no} />
              </div>
            ))}
          </div>
        </div>

        {/* ---------- Mobile / tablet: vertical timeline ---------- */}
        <ol className="mt-10 space-y-5 lg:hidden">
          {milestones.map((item) => (
            <li key={item.no} className="flex gap-4">
              <div className="flex flex-col items-center pt-1">
                <NumberBadge value={item.no} />
                <span className="mt-2 h-full w-px flex-1 bg-lantern/50" />
              </div>
              <div className="flex-1 pb-2">
                <TimelineCard item={item} />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default WhoWeAre;
