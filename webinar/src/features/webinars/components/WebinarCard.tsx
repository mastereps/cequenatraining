import { Link } from "react-router-dom";
import type { IconType } from "react-icons";
import { FiArrowRight, FiBookOpen, FiCalendar, FiCpu, FiImage } from "react-icons/fi";
import {
  getSubmittedEmailForWebinar,
  getSubmittedPaymentMetaForWebinar,
  getSubmittedStatusForWebinar,
} from "../registrationSession";
import type { Webinar } from "../types";
import { formatManilaDateTime, formatSeatLabel } from "../format";
import { getWebinarPlaceholder } from "../placeholders";
import { formatPrice } from "../../../utils/formatPrice";

interface WebinarCardProps {
  webinar: Webinar;
  /** Renders the archive variant: no seats, no registration call to action. */
  past?: boolean;
}

const pickTopicIcon = (topic: string): IconType =>
  topic?.toLowerCase().includes("ai") ? FiCpu : FiBookOpen;

/** Hero image area: the uploaded poster when present, else a themed placeholder. */
const WebinarHero = ({ webinar }: { webinar: Webinar }) => (
  <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700/60">
    {webinar.poster_image_url ? (
      <img
        src={webinar.poster_image_url}
        alt={webinar.title}
        className="h-full w-full object-cover"
      />
    ) : (
      <>
        <img
          src={getWebinarPlaceholder(webinar.topic, webinar.id)}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70">
          <span className="rounded-lg border-2 border-white/40 p-3">
            <FiImage size={26} aria-hidden="true" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.18em]">
            Webinar image
          </span>
        </div>
      </>
    )}
  </div>
);

const TopicBadge = ({ topic }: { topic: string }) => {
  const Icon = pickTopicIcon(topic);
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:bg-slate-800 dark:text-slate-200">
      <Icon aria-hidden="true" />
      {topic}
    </div>
  );
};

const WebinarCard = ({ webinar, past = false }: WebinarCardProps) => {
  // A finished webinar has no registration state worth reading, so the whole
  // session-lock branch below is skipped rather than threaded with conditionals.
  if (past) {
    return (
      <article className="h-full rounded-lg border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
        <div className="p-4">
          <WebinarHero webinar={webinar} />
          <div className="px-2 pb-2 pt-4">
            <TopicBadge topic={webinar.topic} />
            <h3 className="mt-3 font-heading text-2xl uppercase leading-tight text-slate-700 dark:text-slate-200">
              {webinar.title}
            </h3>
            <p className="mt-3 text-base text-slate-600 dark:text-slate-300">
              {webinar.description}
            </p>

            <div className="mt-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <FiCalendar aria-hidden="true" />
              <span>Held on {formatManilaDateTime(webinar.start_at)} (Asia/Manila)</span>
            </div>

            <div className="mt-6">
              <Link
                to={`/webinars/${webinar.slug}`}
                className="inline-flex items-center gap-2 rounded border border-slate-300 px-5 py-3 font-text text-sm font-bold uppercase tracking-[0.08em] text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                View details
                <FiArrowRight aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </article>
    );
  }

  const submittedEmail = getSubmittedEmailForWebinar(webinar.slug);
  const submittedStatus = getSubmittedStatusForWebinar(webinar.slug);
  const paymentMeta = getSubmittedPaymentMetaForWebinar(webinar.slug);
  const priceCents = Number(webinar.price_cents ?? 0);
  const isPaid = priceCents > 0;
  const paymentSettled =
    paymentMeta.paymentRequired === false || paymentMeta.paymentStatus === "paid";
  const needsPaymentAction =
    submittedStatus === "verified" &&
    !paymentSettled &&
    (paymentMeta.paymentRequired === true || isPaid);
  const paymentUnderReview = needsPaymentAction && paymentMeta.paymentStatus === "proof_submitted";
  const paymentRejected = needsPaymentAction && paymentMeta.paymentStatus === "rejected";
  const confirmedLink = submittedEmail
    ? `/webinars/${webinar.slug}/confirmed?email=${encodeURIComponent(submittedEmail)}`
    : `/webinars/${webinar.slug}/confirmed`;

  return (
    <article className="h-full rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="p-4">
        <WebinarHero webinar={webinar} />
        <div className="px-2 pb-2 pt-4">
          <TopicBadge topic={webinar.topic} />
          <h3 className="mt-3 text-2xl font-heading uppercase leading-tight text-slate-900 dark:text-slate-100">
            {webinar.title}
          </h3>
          <p className="mt-3 text-base text-slate-700 dark:text-slate-200">
            {webinar.description}
          </p>

          <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <p className="font-semibold text-lantern">
              {isPaid ? formatPrice(priceCents, webinar.currency) : "Free webinar"}
            </p>
            <p className="flex items-center gap-2">
              <FiCalendar aria-hidden="true" />
              <span>{formatManilaDateTime(webinar.start_at)} (Asia/Manila)</span>
            </p>
            <p className={webinar.is_full ? "text-red-600 dark:text-red-400" : ""}>
              {formatSeatLabel(webinar.available_seats)}
            </p>
          </div>

          <div className="mt-6">
            {paymentUnderReview ? (
              <Link
                to={confirmedLink}
                className="inline-block rounded bg-[#00a34a] px-5 py-3 font-text text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
              >
                Payment under review
              </Link>
            ) : submittedStatus === "verified" && paymentSettled ? (
              <Link
                to={confirmedLink}
                className="inline-block rounded bg-emerald-700 px-5 py-3 font-text text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:bg-emerald-800"
              >
                {isPaid ? "Payment approved" : "Already registered"}
              </Link>
            ) : needsPaymentAction ? (
              <Link
                to={confirmedLink}
                className="inline-block rounded bg-[#00a34a] px-5 py-3 font-text text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
              >
                {paymentRejected ? "Resubmit payment" : "Proceed to payment"}
              </Link>
            ) : submittedStatus === "verified" ? (
              <span
                aria-disabled="true"
                className="inline-block cursor-not-allowed rounded bg-emerald-700 px-5 py-3 font-text text-sm font-bold uppercase tracking-[0.08em] text-white opacity-80"
              >
                Already registered
              </span>
            ) : submittedStatus === "pending" && submittedEmail ? (
              <Link
                to={`/webinars/${webinar.slug}/submitted?email=${encodeURIComponent(submittedEmail)}`}
                className="inline-block rounded bg-amber-600 px-5 py-3 font-text text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:bg-amber-700"
              >
                Verification pending
              </Link>
            ) : (
              <Link
                to={`/webinars/${webinar.slug}`}
                className="inline-flex items-center gap-2 rounded bg-lantern px-5 py-3 font-text text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:bg-lantern/90"
              >
                Reserve my spot
                <FiArrowRight aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

export default WebinarCard;
