import { Link } from "react-router-dom";
import { hasSubmittedWebinarRegistration } from "../registrationSession";
import type { Webinar } from "../types";
import { formatManilaDateTime, formatSeatLabel } from "../format";

interface WebinarCardProps {
  webinar: Webinar;
}

const WebinarCard = ({ webinar }: WebinarCardProps) => {
  const alreadySubmitted = hasSubmittedWebinarRegistration(webinar.slug);

  return (
    <article className="h-full rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="p-6">
        <div className="mb-3 inline-block rounded bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:bg-slate-800 dark:text-slate-200">
          {webinar.topic}
        </div>
        <h3 className="text-2xl font-heading uppercase leading-tight text-slate-900 dark:text-slate-100">
          {webinar.title}
        </h3>
        <p className="mt-3 text-base text-slate-700 dark:text-slate-200">
          {webinar.description}
        </p>

        <div className="mt-4 space-y-1 text-sm text-slate-600 dark:text-slate-300">
          <p>{formatManilaDateTime(webinar.start_at)} (Asia/Manila)</p>
          <p className={webinar.is_full ? "text-red-600 dark:text-red-400" : ""}>
            {formatSeatLabel(webinar.available_seats)}
          </p>
        </div>

        <div className="mt-6">
          {alreadySubmitted ? (
            <span
              aria-disabled="true"
              className="inline-block cursor-not-allowed rounded bg-emerald-700 px-5 py-3 font-text text-sm font-bold uppercase tracking-[0.08em] text-white opacity-80"
            >
              Already registered
            </span>
          ) : (
            <Link
              to={`/webinars/${webinar.slug}`}
              className="inline-block rounded bg-lantern px-5 py-3 font-text text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:bg-lantern/90"
            >
              Reserve my spot
            </Link>
          )}
        </div>
      </div>
    </article>
  );
};

export default WebinarCard;
