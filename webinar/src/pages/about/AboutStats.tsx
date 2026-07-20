import type { SectionContent } from "../../features/content/types";
import { pickList } from "../../features/content/helpers";

type StatCard = { value: string; label: string; text: string };

const DEFAULT_CARDS: StatCard[] = [
  {
    value: "30+",
    label: "Years in education",
    text: "Teaching, research, curriculum development, and professional learning shaped by classroom realities.",
  },
  {
    value: "Literacy",
    label: "Core focus areas",
    text: "Reading instruction, ESL support, and reflective strategies that help teachers meet learners where they are.",
  },
  {
    value: "Books + Webinars",
    label: "Practical professional learning",
    text: "Resources designed to make ideas usable, sustainable, and worth bringing back into the next school day.",
  },
];

const AboutStats = ({ content }: { content?: SectionContent }) => {
  const cards = pickList<StatCard>(content, "cards", DEFAULT_CARDS);

  return (
    <div className="mt-14 grid gap-4 md:grid-cols-3">
      {cards.map((card, index) => (
        <div
          key={index}
          className="border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none"
        >
          <p className="font-heading text-4xl uppercase text-lantern">{card.value}</p>
          <p className="mt-3 text-sm uppercase tracking-[0.18em] text-slate-500 dark:text-white/55">
            {card.label}
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-white/72">
            {card.text}
          </p>
        </div>
      ))}
    </div>
  );
};

export default AboutStats;
