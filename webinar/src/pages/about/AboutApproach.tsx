import ZoomPhoto from "../../assets/images/005_zoom.png";
import type { SectionContent } from "../../features/content/types";
import { pickList, pickString } from "../../features/content/helpers";

type ApproachCard = { label: string; text: string };

const DEFAULT_CARDS: ApproachCard[] = [
  {
    label: "What educators gain",
    text: "Clear frameworks, practical strategies, and actionable next steps for literacy and language instruction.",
  },
  {
    label: "What drives the work",
    text: "Partnership, mentorship, and better outcomes for students through better-supported teachers.",
  },
];

const AboutApproach = ({ content }: { content?: SectionContent }) => {
  const image = pickString(content, "image_url", ZoomPhoto);
  const eyebrow = pickString(content, "eyebrow", "Her Approach");
  const heading = pickString(
    content,
    "heading",
    "Research-backed ideas, translated into teaching moves that feel usable right away.",
  );
  const paragraph = pickString(
    content,
    "paragraph",
    "Maria builds learning experiences that respect the pace of teachers while still pushing toward better instruction. Her work is rooted in reflection, collaboration, and the belief that strong professional development should leave educators with clarity, not overload.",
  );
  const cards = pickList<ApproachCard>(content, "cards", DEFAULT_CARDS);

  return (
    <div className="mt-20 grid gap-10 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1fr)] lg:items-center">
      <div className="overflow-hidden border border-slate-200 shadow-sm dark:border-white/10 dark:shadow-none">
        <img
          src={image}
          alt="Maria Cequena leading an online session"
          className="h-full min-h-[320px] w-full object-cover"
        />
      </div>

      <div>
        <p className="text-sm uppercase tracking-[0.28em] text-slate-500 dark:text-white/55">
          {eyebrow}
        </p>
        <h3 className="mt-5 max-w-2xl font-heading text-3xl uppercase leading-tight text-slate-900 dark:text-white sm:text-5xl">
          {heading}
        </h3>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-white/78">
          {paragraph}
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {cards.map((card, index) => (
            <div
              key={index}
              className="border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-transparent dark:shadow-none"
            >
              <p className="font-text text-xs uppercase tracking-[0.22em] text-lantern">
                {card.label}
              </p>
              <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-white/75">
                {card.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AboutApproach;
