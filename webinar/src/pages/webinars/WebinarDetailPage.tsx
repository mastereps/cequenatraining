import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchWebinarBySlug } from "../../features/webinars/api";
import type { Webinar } from "../../features/webinars/types";
import { formatManilaDateTime, formatSeatLabel } from "../../features/webinars/format";

const WebinarDetailPage = () => {
  const { slug = "" } = useParams();
  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchWebinarBySlug(slug);
        if (active) setWebinar(response);
      } catch (loadError) {
        const message =
          loadError instanceof Error ? loadError.message : "Failed to load webinar details.";
        if (active) setError(message);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return <main className="mx-auto mt-28 max-w-[900px] px-4">Loading webinar...</main>;
  }

  if (error || !webinar) {
    return (
      <main className="mx-auto mt-28 max-w-[900px] px-4">
        <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">
          {error || "Webinar not found."}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto mt-28 max-w-[900px] px-4 pb-20">
      <p className="mb-2 inline-block rounded bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:bg-slate-800 dark:text-slate-200">
        {webinar.topic}
      </p>
      <h1 className="font-heading text-5xl uppercase">{webinar.title}</h1>
      <p className="mt-5 text-lg leading-relaxed text-slate-700 dark:text-slate-200">
        {webinar.description}
      </p>

      <div className="mt-8 space-y-2 rounded-lg border border-slate-200 bg-white p-6 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
        <p>
          <strong>Schedule:</strong> {formatManilaDateTime(webinar.start_at)} -{" "}
          {formatManilaDateTime(webinar.end_at)}
        </p>
        <p>
          <strong>Timezone:</strong> Asia/Manila
        </p>
        <p>
          <strong>Availability:</strong> {formatSeatLabel(webinar.available_seats)}
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        <Link
          to={`/webinars/${webinar.slug}/register`}
          className="rounded bg-lantern px-6 py-3 font-text text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:bg-lantern/90"
        >
          Reserve my spot
        </Link>
        <Link
          to="/webinars"
          className="rounded border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Back to webinars
        </Link>
      </div>
    </main>
  );
};

export default WebinarDetailPage;
