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
          ? "mt-1.5 font-text text-base leading-snug text-black/80"
          : "mt-1.5 font-text text-base leading-snug text-slate-600 dark:text-white/70"
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

// Grid tracks follow the row's length, so the timeline survives any milestone count.
const columns = (count: number) => ({
  gridTemplateColumns: `repeat(${Math.max(count, 1)}, minmax(0, 1fr))`,
});

const WhoWeAre = ({ content }: { content?: SectionContent }) => {
  const heading = pickString(content, "heading", "Who We Are");
  const subheading = pickString(content, "subheading", "A Brief Story About Maria Cequeña");
  const milestones = pickList<Milestone>(content, "milestones", MILESTONES);
  // Position supplies the number when a milestone leaves it blank, so adding or
  // removing one in the admin doesn't leave a gap in the sequence.
  const numbered = milestones.map((item, index) => ({
    ...item,
    key: index,
    no: item.no || String(index + 1).padStart(2, "0"),
  }));
  const splitAt = Math.ceil(numbered.length / 2);
  const topRow = numbered.slice(0, splitAt);
  const bottomRow = numbered.slice(splitAt).reverse(); // read right-to-left

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
        {/* Both rows read number → rail → card, top to bottom. */}
        <div className="mt-12 hidden px-8 lg:block">
          {/* First-half numbers */}
          <div className="grid gap-6" style={columns(topRow.length)}>
            {topRow.map((item) => (
              <div key={item.key} className="flex justify-center">
                <NumberBadge value={item.no} />
              </div>
            ))}
          </div>

          {/* The rail runs along this box: top edge, right elbow, bottom edge. */}
          <div className="relative mt-3">
            {/* top rail — starts under the first dot */}
            <div
              className="pointer-events-none absolute right-0 top-0 border-t-2 border-lantern/60"
              style={{ left: `calc(50% / ${Math.max(topRow.length, 1)} - 6px)` }}
            />
            {/* right elbow, wrapping top rail down to bottom rail */}
            <div className="pointer-events-none absolute inset-y-0 -right-8 w-8 rounded-r-2xl border-y-2 border-r-2 border-lantern/60" />
            {/* bottom rail + arrowhead pointing back to the start */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 border-t-2 border-lantern/60" />
            <span className="pointer-events-none absolute -left-2 bottom-0 h-2.5 w-2.5 translate-y-1/2 rotate-45 border-b-2 border-l-2 border-lantern/60" />

            {/* dots on the top rail */}
            <div className="grid h-0 gap-6" style={columns(topRow.length)}>
              {topRow.map((item) => (
                <div key={item.key} className="flex justify-center">
                  <RailDot />
                </div>
              ))}
            </div>

            {/* first-half cards */}
            <div
              className="grid items-stretch gap-6 pt-8"
              style={columns(topRow.length)}
            >
              {topRow.map((item) => (
                <div key={item.key} className="mx-auto w-full max-w-[250px]">
                  <TimelineCard item={item} centered />
                </div>
              ))}
            </div>

            {/* second-half numbers */}
            <div className="mt-14 grid gap-6" style={columns(bottomRow.length)}>
              {bottomRow.map((item) => (
                <div key={item.key} className="flex justify-center">
                  <NumberBadge value={item.no} />
                </div>
              ))}
            </div>

            {/* dots on the bottom rail */}
            <div className="mt-3 grid h-0 gap-6" style={columns(bottomRow.length)}>
              {bottomRow.map((item) => (
                <div key={item.key} className="flex justify-center">
                  <RailDot />
                </div>
              ))}
            </div>
          </div>

          {/* second-half cards */}
          <div
            className="mt-8 grid items-stretch gap-6"
            style={columns(bottomRow.length)}
          >
            {bottomRow.map((item) => (
              <div key={item.key} className="mx-auto w-full max-w-[250px]">
                <TimelineCard item={item} centered />
              </div>
            ))}
          </div>
        </div>

        {/* ---------- Mobile / tablet: vertical timeline ---------- */}
        <ol className="mt-10 space-y-5 lg:hidden">
          {numbered.map((item) => (
            <li key={item.key} className="flex gap-4">
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
