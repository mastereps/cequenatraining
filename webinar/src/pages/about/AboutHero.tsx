import { Link } from "react-router-dom";
import HeroBanner from "../../assets/images/hero-webinar.jpg";
import type { SectionContent } from "../../features/content/types";
import { pickString } from "../../features/content/helpers";

const AboutHero = ({ content }: { content?: SectionContent }) => {
  const breadcrumb = pickString(content, "breadcrumb_label", "About");
  const title = pickString(content, "title", "Practical Webinars");
  const subtitle = pickString(
    content,
    "subtitle",
    "Empowering teachers with practical and research-based learning",
  );

  return (
    <div className="relative h-[350px] w-full overflow-hidden border-b border-slate-200 dark:border-white/10 sm:h-[40vh] sm:min-h-[320px] sm:max-h-[420px]">
      <img
        src={HeroBanner}
        alt="Practical webinars hero"
        className="h-full w-full object-cover object-bottom"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/65 via-slate-950/40 to-slate-950/55 dark:from-black/60 dark:via-black/40 dark:to-black/55" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(227,179,35,0.24),transparent_45%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(227,179,35,0.2),transparent_45%)]" />
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[1240px] px-4 pb-8 text-white">
        <p className="mb-3 text-sm">
          <Link to="/" className="text-white/70 transition hover:text-white">
            Home
          </Link>{" "}
          / <span className="text-white">{breadcrumb}</span>
        </p>
        <h1 className="font-heading text-4xl uppercase sm:text-6xl">{title}</h1>
        <p className="mt-4 font-text text-sm uppercase tracking-[0.08em] sm:text-base">
          {subtitle}
        </p>
      </div>
    </div>
  );
};

export default AboutHero;
