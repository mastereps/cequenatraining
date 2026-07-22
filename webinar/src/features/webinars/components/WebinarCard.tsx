import { Link } from "react-router-dom";
import {
  getSubmittedEmailForWebinar,
  getSubmittedPaymentMetaForWebinar,
  getSubmittedStatusForWebinar,
} from "../registrationSession";
import type { Webinar } from "../types";
import { formatManilaDateTime, formatSeatLabel } from "../format";
import { formatPrice } from "../../../utils/formatPrice";

interface WebinarCardProps {
  webinar: Webinar;
  /** Renders the archive variant: no seats, no registration call to action. */
  past?: boolean;
}

const WebinarCard = ({ webinar, past = false }: WebinarCardProps) => {
  // A finished webinar has no registration state worth reading, so the whole
  // session-lock branch below is skipped rather than threaded with conditionals.
  if (past) {
    return (
      <article className="h-full rounded-lg border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
        <div className="p-6">
          <div className="mb-3 inline-block rounded bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {webinar.topic}
          </div>
          <h3 className="font-heading text-2xl uppercase leading-tight text-slate-700 dark:text-slate-200">
            {webinar.title}
          </h3>
          <p className="mt-3 text-base text-slate-600 dark:text-slate-300">
            {webinar.description}
          </p>

          <div className="mt-4 space-y-1 text-sm text-slate-500 dark:text-slate-400">
            <p>Held on {formatManilaDateTime(webinar.start_at)} (Asia/Manila)</p>
          </div>

          <div className="mt-6">
            <Link
              to={`/webinars/${webinar.slug}`}
              className="inline-block rounded border border-slate-300 px-5 py-3 font-text text-sm font-bold uppercase tracking-[0.08em] text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              View details
            </Link>
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
          <p className="font-semibold text-lantern">
            {isPaid ? formatPrice(priceCents, webinar.currency) : "Free webinar"}
          </p>
          <p>{formatManilaDateTime(webinar.start_at)} (Asia/Manila)</p>
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
