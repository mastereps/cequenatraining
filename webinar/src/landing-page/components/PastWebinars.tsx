import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";
import { fetchWebinars } from "../../features/webinars/api";
import type { Webinar } from "../../features/webinars/types";
import WebinarCard from "../../features/webinars/components/WebinarCard";
import type { SectionContent } from "../../features/content/types";

const asString = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim() ? value : fallback;

/**
 * Home section showing a curated set of already-finished webinars. The admin
 * picks which webinars appear (and in what order) by their slug in the content
 * manager; with none chosen the section renders nothing rather than an empty
 * shell.
 */
const PastWebinars = ({ content = {} }: { content?: SectionContent }) => {
  const slugs = Array.isArray(content.slugs)
    ? (content.slugs as unknown[]).filter((item): item is string => typeof item === "string")
    : [];
  const heading = asString(content.heading, "Past Webinars");
  const subheading = asString(
    content.subheading,
    "A look back at some of the sessions we have already run.",
  );

  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slugs.length === 0) {
      setWebinars([]);
      setLoading(false);
      return;
    }

    let active = true;
    void (async () => {
      setLoading(true);
      try {
        const data = await fetchWebinars({ when: "past", limit: 100 });
        if (!active) return;
        const bySlug = new Map(data.map((webinar) => [webinar.slug, webinar]));
        // Preserve the admin-chosen order and drop any slug that no longer resolves.
        const chosen = slugs
          .map((slug) => bySlug.get(slug))
          .filter((webinar): webinar is Webinar => Boolean(webinar));
        setWebinars(chosen);
      } catch {
        if (active) setWebinars([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // Re-run when the curated slug list changes.
  }, [slugs.join(",")]);

  if (loading || webinars.length === 0) return null;

  return (
    <section className="mx-auto my-24 max-w-[1240px] px-4">
      <header className="mb-10 text-center">
        <p className="headline-gradient mb-3 font-text text-lg font-bold uppercase tracking-[0.05em]">
          Past sessions
        </p>
        <h2 className="font-heading text-4xl uppercase">{heading}</h2>
        {subheading ? (
          <p className="mx-auto mt-4 max-w-2xl text-slate-600 dark:text-slate-300">{subheading}</p>
        ) : null}
      </header>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {webinars.map((webinar) => (
          <WebinarCard key={webinar.id} webinar={webinar} past />
        ))}
      </div>
      <div className="mt-10 text-center">
        <Link
          to="/webinars"
          className="inline-flex items-center gap-2 rounded border border-slate-300 px-6 py-3 font-text text-sm font-bold uppercase tracking-[0.08em] text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          View all past webinars
          <FiArrowRight aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
};

export default PastWebinars;
