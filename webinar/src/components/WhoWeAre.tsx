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

const TimelineCard = ({
  item,
  centered = false,
}: {
  item: Milestone;
  centered?: boolean;
}) => (
  <div
    className={[
      "flex h-full flex-col rounded-md border px-4 py-4",
      centered ? "items-center text-center" : "",
      item.highlight
        ? "border-lantern bg-lantern text-black"
        : "border-slate-300 bg-white text-slate-900 shadow-sm dark:border-lantern/40 dark:bg-white/[0.03] dark:text-white dark:shadow-none",
    ].join(" ")}
  >
    <h3 className="font-heading text-lg uppercase leading-tight">
      {item.title}
    </h3>
    <p
      className={
        item.highlight
          ? "mt-1.5 font-text text-xs leading-snug text-black/80"
          : "mt-1.5 font-text text-xs leading-snug text-slate-600 dark:text-white/70"
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

// Sits in a zero-height row so it centers on the rail it straddles.
const RailDot = () => (
  <span className="block h-3 w-3 -translate-y-1/2 rounded-full border-2 border-lantern bg-slate-50 dark:bg-black" />
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

        {/* ---------- Desktop: snaking timeline (lg and up) ---------- */}
        <div className="mt-12 hidden px-8 lg:block">
          {/* Numbers 01 → 04 */}
          <div className="grid grid-cols-4 gap-6">
            {topRow.map((item) => (
              <div key={item.no} className="flex justify-center">
                <NumberBadge value={item.no} />
              </div>
            ))}
          </div>

          {/* The rail runs along this box: top edge, right elbow, bottom edge. */}
          <div className="relative mt-3">
            {/* top rail — starts under the 01 dot */}
            <div className="pointer-events-none absolute left-[calc(12.5%-6px)] right-0 top-0 border-t-2 border-lantern/60" />
            {/* right elbow, wrapping top rail down to bottom rail */}
            <div className="pointer-events-none absolute inset-y-0 -right-8 w-8 rounded-r-2xl border-y-2 border-r-2 border-lantern/60" />
            {/* bottom rail + arrowhead pointing back to the start */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 border-t-2 border-lantern/60" />
            <span className="pointer-events-none absolute -left-2 bottom-0 h-2.5 w-2.5 translate-y-1/2 rotate-45 border-b-2 border-l-2 border-lantern/60" />

            {/* dots on the top rail */}
            <div className="grid h-0 grid-cols-4 gap-6">
              {topRow.map((item) => (
                <div key={item.no} className="flex justify-center">
                  <RailDot />
                </div>
              ))}
            </div>

            {/* Cards 01 → 04 */}
            <div className="grid grid-cols-4 items-stretch gap-6 pt-8">
              {topRow.map((item) => (
                <div key={item.no} className="mx-auto w-full max-w-[250px]">
                  <TimelineCard item={item} centered />
                </div>
              ))}
            </div>

            {/* Cards 08 → 05 */}
            <div className="grid grid-cols-4 items-stretch gap-6 pt-14">
              {bottomRow.map((item) => (
                <div key={item.no} className="mx-auto w-full max-w-[250px]">
                  <TimelineCard item={item} centered />
                </div>
              ))}
            </div>

            {/* dots on the bottom rail */}
            <div className="mt-8 grid h-0 grid-cols-4 gap-6">
              {bottomRow.map((item) => (
                <div key={item.no} className="flex justify-center">
                  <RailDot />
                </div>
              ))}
            </div>
          </div>

          {/* Numbers 08 → 05 */}
          <div className="mt-12 grid grid-cols-4 gap-6">
            {bottomRow.map((item) => (
              <div key={item.no} className="flex justify-center">
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
