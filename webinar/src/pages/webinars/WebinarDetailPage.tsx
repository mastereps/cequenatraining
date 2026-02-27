import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchRegistrationStatus, fetchWebinarBySlug } from "../../features/webinars/api";
import {
  clearSubmittedEmailForWebinar,
  getSubmittedEmailForWebinar,
  getSubmittedStatusForWebinar,
  setSubmittedEmailForWebinar,
  setSubmittedStatusForWebinar,
} from "../../features/webinars/registrationSession";
import type { Webinar, WebinarPaymentStatus } from "../../features/webinars/types";
import { formatManilaDateTime, formatSeatLabel } from "../../features/webinars/format";
import { useAuth } from "../../store/AuthContext";
import { formatPrice } from "../../utils/formatPrice";

const WebinarDetailPage = () => {
  const { slug = "" } = useParams();
  const { user } = useAuth();
  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [registrationStatus, setRegistrationStatus] = useState<"pending" | "verified" | null>(
    null,
  );
  const [paymentRequired, setPaymentRequired] = useState<boolean | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<WebinarPaymentStatus | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState("");
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

  useEffect(() => {
    if (!webinar) return;

    let active = true;
    const syncSubmittedState = async () => {
      if (user) {
        try {
          const status = await fetchRegistrationStatus(webinar.slug, {
            userId: user.id,
            email: user.email,
          });
          if (status.registered) {
            const targetEmail = status.email || user.email;
            setSubmittedEmailForWebinar(webinar.slug, targetEmail);
            if (active) setSubmittedEmail(targetEmail);
            if (active) setPaymentRequired(status.payment_required);
            if (active) setPaymentStatus(status.payment_status);
            if (status.status === "pending" || status.status === "verified") {
              setSubmittedStatusForWebinar(webinar.slug, status.status);
              if (active) setRegistrationStatus(status.status);
            } else if (active) {
              setRegistrationStatus(null);
            }
          } else {
            clearSubmittedEmailForWebinar(webinar.slug);
            if (active) setSubmittedEmail("");
            if (active) setRegistrationStatus(null);
            if (active) setPaymentRequired(null);
            if (active) setPaymentStatus(null);
          }
          return;
        } catch {
          if (active) setRegistrationStatus(null);
          if (active) setPaymentRequired(null);
          if (active) setPaymentStatus(null);
          return;
        }
      }

      const rememberedEmail = getSubmittedEmailForWebinar(webinar.slug);
      if (!rememberedEmail) {
        if (active) setSubmittedEmail("");
        if (active) setRegistrationStatus(null);
        if (active) setPaymentRequired(null);
        if (active) setPaymentStatus(null);
        return;
      }

      try {
        const status = await fetchRegistrationStatus(webinar.slug, { email: rememberedEmail });
        if (!status.registered) {
          clearSubmittedEmailForWebinar(webinar.slug);
          if (active) setSubmittedEmail("");
          if (active) setRegistrationStatus(null);
          return;
        }

        const targetEmail = status.email || rememberedEmail;
        setSubmittedEmailForWebinar(webinar.slug, targetEmail);
        if (active) setSubmittedEmail(targetEmail);
        if (active) setPaymentRequired(status.payment_required);
        if (active) setPaymentStatus(status.payment_status);
        if (status.status === "pending" || status.status === "verified") {
          setSubmittedStatusForWebinar(webinar.slug, status.status);
          if (active) setRegistrationStatus(status.status);
        } else if (active) {
          setRegistrationStatus(getSubmittedStatusForWebinar(webinar.slug));
        }
      } catch {
        clearSubmittedEmailForWebinar(webinar.slug);
        if (active) setSubmittedEmail("");
        if (active) setRegistrationStatus(null);
        if (active) setPaymentRequired(null);
        if (active) setPaymentStatus(null);
      }
    };

    void syncSubmittedState();
    return () => {
      active = false;
    };
  }, [user, webinar]);

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

  const isConfirmedRegistration =
    registrationStatus === "verified" &&
    (paymentRequired === false || paymentStatus === "paid");
  const priceCents = Number(webinar.price_cents ?? 0);
  const isPaid = priceCents > 0;

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
        <p>
          <strong>Fee:</strong> {isPaid ? formatPrice(priceCents, webinar.currency) : "Free webinar"}
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        {isConfirmedRegistration ? (
          <span
            aria-disabled="true"
            className="cursor-not-allowed rounded bg-emerald-700 px-6 py-3 font-text text-sm font-bold uppercase tracking-[0.08em] text-white opacity-80"
          >
            Already registered
          </span>
        ) : registrationStatus === "verified" ? (
          <Link
            to={`/webinars/${webinar.slug}/confirmed?email=${encodeURIComponent(submittedEmail)}`}
            className="rounded bg-[#00a34a] px-6 py-3 font-text text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
          >
            Payment pending
          </Link>
        ) : registrationStatus === "pending" ? (
          <Link
            to={`/webinars/${webinar.slug}/submitted?email=${encodeURIComponent(submittedEmail)}`}
            className="rounded bg-amber-600 px-6 py-3 font-text text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:bg-amber-700"
          >
            Verification pending
          </Link>
        ) : (
          <Link
            to={`/webinars/${webinar.slug}/register`}
            className="rounded bg-lantern px-6 py-3 font-text text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:bg-lantern/90"
          >
            Reserve my spot
          </Link>
        )}
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
