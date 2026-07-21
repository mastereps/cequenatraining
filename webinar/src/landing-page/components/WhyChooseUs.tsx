import { Link } from "react-router-dom";
import {
  FiAward,
  FiBook,
  FiBookOpen,
  FiEdit3,
  FiMonitor,
  FiUsers,
} from "react-icons/fi";
import type { IconType } from "react-icons";
import type { SectionContent } from "../../features/content/types";
import { pickList, pickString } from "../../features/content/helpers";

type Reason = { title: string; text: string };

// Icons stay in code (structural, not editable content) and are matched to
// cards by position, cycling if an admin adds more than six.
const REASON_ICONS: IconType[] = [
  FiUsers,
  FiAward,
  FiBookOpen,
  FiMonitor,
  FiBook,
  FiEdit3,
];

const DEFAULT_REASONS: Reason[] = [
  { title: "Expert-Led Webinars", text: "Sessions led by seasoned educators and researchers." },
  { title: "CPD Units for Members", text: "Earn CPD units from qualified webinars." },
  { title: "Made for Researchers & Teachers", text: "Topics built around real teaching and research." },
  { title: "Flexible Online Learning", text: "Join from anywhere, on your own schedule." },
  { title: "Internationally Recognized Books", text: "Titles with genuine academic standing." },
  { title: "Local Poetry & Cultural Works", text: "Filipino poetry and literary works worth keeping." },
];

const WhyChooseUs = ({ content }: { content?: SectionContent }) => {
  const eyebrow = pickString(content, "eyebrow", "Why Choose Us");
  const heading = pickString(content, "heading", "Learning Built for Educators");
  const subheading = pickString(
    content,
    "subheading",
    "Credible sessions, CPD growth, and publications for researchers, teachers, and lifelong learners.",
  );
  const ctaLabel = pickString(content, "cta_label", "Explore Webinars");
  const reasons = pickList<Reason>(content, "reasons", DEFAULT_REASONS);

  return (
    <section className="mt-30 px-3 text-center sm:px-4">
      <header className="mb-11">
        <p className="headline-gradient mb-4 font-text text-lg font-bold uppercase tracking-[0.05em]">
          {eyebrow}
        </p>
        <h2 className="font-heading text-5xl uppercase">{heading}</h2>
        <p className="mx-auto mt-4 max-w-[70ch] text-xl text-slate-600 dark:text-white/75">
          {subheading}
        </p>
      </header>

      <div className="mx-auto grid w-full max-w-[1100px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reasons.map((reason, index) => {
          const Icon = REASON_ICONS[index % REASON_ICONS.length];
          return (
            <article
              key={`${reason.title}-${index}`}
              className="flex items-start gap-4 border border-black/15 bg-white p-6 text-left shadow-sm
                transition-all duration-300 hover:-translate-y-1 hover:border-lantern/60
                hover:shadow-[0_10px_30px_rgba(97,176,139,0.18)]
                dark:border-white/15 dark:bg-transparent dark:shadow-none dark:hover:border-lantern/60"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-lantern/12 text-lantern dark:bg-lantern/15">
                <Icon aria-hidden className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-text text-lg font-bold uppercase tracking-[0.04em]">
                  {reason.title}
                </h3>
                <p className="mt-2 text-base leading-relaxed text-slate-600 dark:text-white/75">
                  {reason.text}
                </p>
              </div>
            </article>
          );
        })}
      </div>

      <Link
        to="/webinars"
        className="mt-10 inline-flex items-center gap-3 rounded-sm bg-lantern px-8 py-3 font-text
          font-bold uppercase tracking-[0.08em] text-white transition-all duration-300
          hover:bg-lantern/85 hover:shadow-[0_10px_30px_rgba(97,176,139,0.35)]
          dark:hover:bg-white dark:hover:text-black dark:hover:shadow-[0_0_0_.2rem_#fff]"
      >
        {ctaLabel}
        <span aria-hidden>&rsaquo;</span>
      </Link>
    </section>
  );
};

export default WhyChooseUs;
