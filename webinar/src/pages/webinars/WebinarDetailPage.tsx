import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchRegistrationStatus, fetchWebinarBySlug } from "../../features/webinars/api";
import WebinarQrNoticeModal from "../../features/webinars/components/WebinarQrNoticeModal";
import {
  clearSubmittedEmailForWebinar,
  getSubmittedEmailForWebinar,
  getSubmittedStatusForWebinar,
  setSubmittedEmailForWebinar,
  setSubmittedPaymentMetaForWebinar,
  setSubmittedStatusForWebinar,
} from "../../features/webinars/registrationSession";
import type { Webinar, WebinarPaymentStatus } from "../../features/webinars/types";
import { formatManilaDateTime, formatSeatLabel } from "../../features/webinars/format";
import { getRegistrationQrImageUrl } from "../../features/webinars/registrationQr";
import { useAuth } from "../../store/AuthContext";
import { formatPrice } from "../../utils/formatPrice";

const WebinarDetailPage = () => {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [registrationStatus, setRegistrationStatus] = useState<"pending" | "verified" | null>(
    null,
  );
  const [paymentRequired, setPaymentRequired] = useState<boolean | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<WebinarPaymentStatus | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [isRegistrationNoticeOpen, setIsRegistrationNoticeOpen] = useState(false);
  const [isPosterModalOpen, setIsPosterModalOpen] = useState(false);
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
            setSubmittedPaymentMetaForWebinar(
              webinar.slug,
              status.payment_required,
              status.payment_status,
            );
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
          if (active) setPaymentRequired(null);
          if (active) setPaymentStatus(null);
          return;
        }

        const targetEmail = status.email || rememberedEmail;
        setSubmittedEmailForWebinar(webinar.slug, targetEmail);
        setSubmittedPaymentMetaForWebinar(
          webinar.slug,
          status.payment_required,
          status.payment_status,
        );
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

  useEffect(() => {
    if (!isPosterModalOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPosterModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPosterModalOpen]);

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
  const needsPaymentAction =
    registrationStatus === "verified" &&
    !isConfirmedRegistration &&
    (paymentRequired !== false || isPaid);
  const paymentUnderReview = needsPaymentAction && paymentStatus === "proof_submitted";
  const paymentRejected = needsPaymentAction && paymentStatus === "rejected";
  const isAdmin = String(user?.role || "").trim().toLowerCase() === "admin";
  const confirmedLink = `/webinars/${webinar.slug}/confirmed${
    submittedEmail ? `?email=${encodeURIComponent(submittedEmail)}` : ""
  }`;

  // The server rejects late registrations too; this just stops the page from
  // offering a seat it cannot sell.
  const hasConcluded = new Date(webinar.start_at).getTime() < Date.now();
  const scheduleLabel = `${formatManilaDateTime(webinar.start_at)} - ${formatManilaDateTime(webinar.end_at)}`;
  const feeLabel = isPaid ? formatPrice(priceCents, webinar.currency) : "Free webinar";
  const seatLabel = formatSeatLabel(webinar.available_seats);
  const registrationTone = paymentRejected
    ? "border-red-200 bg-red-50 text-red-900"
    : paymentUnderReview
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : isConfirmedRegistration
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : "border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100";
  const registrationTitle = paymentRejected
    ? "Payment needs to be resubmitted"
    : paymentUnderReview
      ? "Payment is under review"
      : isConfirmedRegistration
        ? "Registration confirmed"
        : registrationStatus === "pending"
          ? "Email verification pending"
          : registrationStatus === "verified"
            ? "Ready for the next step"
            : "GCash Payment";
  const registrationMessage = paymentRejected
    ? "Your payment proof was rejected. Open your submission page and upload the corrected details."
    : paymentUnderReview
      ? "Your proof of payment was received and is waiting for manual approval before the Zoom link is sent."
      : isConfirmedRegistration
        ? "You already have an approved registration for this webinar."
        : registrationStatus === "pending"
          ? "Check your inbox and verify your email first to continue."
          : registrationStatus === "verified"
            ? isPaid
              ? "Your email is verified. Continue to payment so your seat can be finalized."
              : "Your email is verified and your webinar registration is already recorded."
            : "Reserve your spot, verify your email, then complete payment.";

  const quickFacts = [
    { label: "Schedule", value: scheduleLabel },
    { label: "Timezone", value: webinar.timezone || "Asia/Manila" },
    { label: "Availability", value: seatLabel },
    { label: "Fee", value: feeLabel },
  ];
  const registrationQrImageUrl = getRegistrationQrImageUrl(webinar.slug);

  return (
    <main className="mx-auto mt-28 max-w-[1280px] px-4 pb-20">
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-[#050816] sm:p-8 lg:p-10">
        <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,_rgba(97,176,139,0.22),_transparent_55%),radial-gradient(circle_at_top_right,_rgba(31,95,115,0.18),_transparent_45%)]" />

        <div className="relative">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white dark:bg-white dark:text-slate-900">
              {webinar.topic}
            </span>
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
              {feeLabel}
            </span>
            <span className="inline-flex rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200">
              {seatLabel}
            </span>
          </div>

          <div className="mt-6 max-w-4xl">
            <h1 className="font-heading text-5xl uppercase leading-none text-slate-950 dark:text-white sm:text-6xl">
              {webinar.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
              {webinar.description}
            </p>
          </div>

          <div className="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2.35fr)]">
            <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
              <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  {hasConcluded ? "This webinar has ended" : "Registration & Payment"}
                </p>

                {hasConcluded ? (
                  <div className="mt-3 space-y-5">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      <p className="text-sm font-semibold uppercase tracking-[0.12em]">
                        Concluded
                      </p>
                      <p className="mt-2 text-sm leading-6">
                        This session ran on {formatManilaDateTime(webinar.start_at)} and is no
                        longer accepting registrations.
                      </p>
                    </div>
                    <Link
                      to="/webinars"
                      className="block rounded-xl border border-slate-300 px-6 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                    >
                      Back to webinars
                    </Link>
                    {isAdmin ? (
                      <Link
                        to={`/admin/webinars/${webinar.slug}/payments`}
                        className="block rounded-xl border border-emerald-500 px-6 py-3 text-center text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-400 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                      >
                        Review payments
                      </Link>
                    ) : null}
                  </div>
                ) : (
                <>
                <div className={`mt-3 rounded-2xl border p-4 ${registrationTone}`}>
                  <p className="text-sm font-semibold uppercase tracking-[0.12em]">
                    {registrationTitle}
                  </p>
                  <p className="mt-2 text-sm leading-6">{registrationMessage}</p>
                </div>

                <div className="mt-5 flex flex-col gap-3">
                  {paymentUnderReview ? (
                    <Link
                      to={confirmedLink}
                      className="rounded-xl bg-[#00a34a] px-6 py-3 text-center font-text text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
                    >
                      Payment under review
                    </Link>
                  ) : isConfirmedRegistration ? (
                    <Link
                      to={confirmedLink}
                      className="rounded-xl bg-emerald-700 px-6 py-3 text-center font-text text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:bg-emerald-800"
                    >
                      {isPaid ? "Payment approved" : "Already registered"}
                    </Link>
                  ) : needsPaymentAction ? (
                    <Link
                      to={confirmedLink}
                      className="rounded-xl bg-[#00a34a] px-6 py-3 text-center font-text text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
                    >
                      {paymentRejected ? "Resubmit payment" : "Proceed to payment"}
                    </Link>
                  ) : registrationStatus === "verified" ? (
                    <span
                      aria-disabled="true"
                      className="cursor-not-allowed rounded-xl bg-emerald-700 px-6 py-3 text-center font-text text-sm font-bold uppercase tracking-[0.08em] text-white opacity-80"
                    >
                      Already registered
                    </span>
                  ) : registrationStatus === "pending" ? (
                    <Link
                      to={`/webinars/${webinar.slug}/submitted?email=${encodeURIComponent(submittedEmail)}`}
                      className="rounded-xl bg-amber-600 px-6 py-3 text-center font-text text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:bg-amber-700"
                    >
                      Verification pending
                    </Link>
                  ) : (
                    isPaid ? (
                      <button
                        type="button"
                        onClick={() => setIsRegistrationNoticeOpen(true)}
                        className="rounded-xl bg-lantern px-6 py-3 text-center font-text text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:bg-lantern/90"
                      >
                        Reserve my spot
                      </button>
                    ) : (
                      <Link
                        to={`/webinars/${webinar.slug}/register`}
                        className="rounded-xl bg-lantern px-6 py-3 text-center font-text text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:bg-lantern/90"
                      >
                        Reserve my spot
                      </Link>
                    )
                  )}

                  <Link
                    to="/webinars"
                    className="rounded-xl border border-slate-300 px-6 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    Back to webinars
                  </Link>

                  {isAdmin ? (
                    <Link
                      to={`/admin/webinars/${webinar.slug}/payments`}
                      className="rounded-xl border border-emerald-500 px-6 py-3 text-center text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-400 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                    >
                      Review payments
                    </Link>
                  ) : null}
                </div>
                </>
                )}
              </section>

              {/* <section className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/80">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  At a glance
                </p>
                <dl className="mt-4 space-y-4">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Delivery
                    </dt>
                    <dd className="mt-1 text-sm leading-6 text-slate-800 dark:text-slate-100">
                      {webinar.join_link_delivery_mode === "manual"
                        ? "Zoom link is sent manually after approval."
                        : "Zoom link is delivered automatically after confirmation."}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Best next step
                    </dt>
                    <dd className="mt-1 text-sm leading-6 text-slate-800 dark:text-slate-100">
                      {registrationStatus === "pending"
                        ? "Verify your email to keep the registration moving."
                        : needsPaymentAction
                          ? "Complete the payment submission to finalize your seat."
                          : isConfirmedRegistration
                            ? "Use your confirmation page for the latest registration updates."
                            : "Reserve a seat and check your inbox for the verification email."}
                    </dd>
                  </div>
                </dl>
              </section> */}
            </aside>

            <div className="space-y-6">
              <section className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,rgba(248,250,252,0.98),rgba(233,246,239,0.75))] p-5 dark:border-slate-800 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(6,78,59,0.45))] sm:p-6">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:items-center">
                  <div className="space-y-4">
                    {!hasConcluded && (
                      <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/85 p-4 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-50">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                          Registration note
                        </p>
                        <p className="mt-2 text-sm leading-6">
                          Scan the QR code to open the registration form and complete the required
                          Google Form.
                        </p>
                      </div>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                    {quickFacts.map((item) => (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-white/70 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-950/50"
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                          {item.label}
                        </p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-900 dark:text-slate-100">
                          {item.value}
                        </p>
                      </div>
                    ))}
                    </div>
                  </div>

                  <div className="flex justify-center lg:justify-end">
                    {webinar.poster_image_url ? (
                      <button
                        type="button"
                        onClick={() => setIsPosterModalOpen(true)}
                        className="group relative w-full max-w-[420px] cursor-zoom-in rounded-[28px] border border-slate-200 bg-white p-3 text-left shadow-[0_18px_50px_rgba(15,23,42,0.12)] transition hover:border-emerald-200 hover:shadow-[0_20px_54px_rgba(15,23,42,0.15)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-emerald-800"
                        aria-label={`Open larger view of ${webinar.title} poster`}
                      >
                        <img
                          src={webinar.poster_image_url}
                          alt={webinar.title}
                          className="h-auto max-h-[720px] w-full rounded-[20px] object-contain"
                        />
                        <span className="pointer-events-none absolute left-3 top-6 rounded-full bg-slate-950/82 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition group-hover:bg-slate-900 group-hover:text-white dark:bg-white/92 dark:text-slate-950 dark:group-hover:bg-slate-900 dark:group-hover:text-white">
                          Enlarge poster
                        </span>
                      </button>
                    ) : (
                      <div className="flex min-h-[320px] w-full max-w-[420px] items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-400">
                        Poster image will appear here once one is added to the webinar.
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* {isPaid ? (
                <section className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-50 sm:p-6">
                  <div className="grid gap-6 lg:grid-cols-[minmax(280px,0.75fr)_minmax(0,1.25fr)] lg:items-start">
                    <div className="rounded-[24px] border border-emerald-200 bg-white p-4 shadow-sm dark:border-emerald-900/40 dark:bg-slate-950/80">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                        GCash QR
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                        Verify your email first, then submit the payment details for review.
                      </p>
                      {webinar.payment_qr_image_url ? (
                        <img
                          src={webinar.payment_qr_image_url}
                          alt={`${webinar.title} payment QR`}
                          className="mx-auto mt-4 w-full max-w-[260px] rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm dark:border-emerald-900/40"
                        />
                      ) : (
                        <div className="mt-4 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/80 p-6 text-center text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                          Payment QR image is not available yet.
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                        Payment flow
                      </p>
                      <h2 className="mt-3 text-2xl font-semibold text-emerald-950 dark:text-white">
                        Pay via GCash and wait for approval
                      </h2>
                      <p className="mt-3 text-sm leading-7 text-emerald-900/90 dark:text-emerald-100/90 sm:text-base">
                        Registration still starts with email verification. After verification, the
                        payer details and proof are checked manually. The Zoom link is delivered
                        after payment approval.
                      </p>

                      {webinar.payment_instructions ? (
                        <div className="mt-5 rounded-[24px] border border-emerald-200 bg-white/90 p-5 text-sm leading-7 whitespace-pre-line dark:border-emerald-900/40 dark:bg-slate-950/70">
                          {webinar.payment_instructions}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </section>
              ) : null} */}
            </div>
          </div>
        </div>
      </section>

      {isPosterModalOpen ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/88 px-3 py-6 backdrop-blur-sm sm:px-5 sm:py-8"
          onClick={() => setIsPosterModalOpen(false)}
          role="presentation"
        >
          <div
            className="relative mx-auto flex min-h-full w-full max-w-5xl items-start justify-center"
            role="presentation"
          >
            <div
              className="relative mt-14 w-full rounded-[32px] border border-white/10 bg-slate-950 p-3 shadow-[0_30px_100px_rgba(0,0,0,0.45)] sm:mt-16 sm:p-5"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={`${webinar.title} poster enlarged`}
            >
              <button
                type="button"
                onClick={() => setIsPosterModalOpen(false)}
                className="absolute right-3 top-3 z-10 rounded-full border border-emerald-300/60 bg-lantern px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-lantern/90 hover:border-emerald-200 sm:right-4 sm:top-4"
              >
                Close
              </button>
              <div className="rounded-[24px] bg-slate-900 p-4 sm:p-6">
                <p className="px-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  Webinar poster
                </p>
                <img
                  src={webinar.poster_image_url || undefined}
                  alt={`${webinar.title} poster`}
                  className="mx-auto mt-4 h-auto w-full max-w-[720px] rounded-[20px] border border-emerald-200 bg-white p-3 object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <WebinarQrNoticeModal
        open={isRegistrationNoticeOpen}
        onClose={() => setIsRegistrationNoticeOpen(false)}
        heading="Registration Required Before Payment"
        notice="Please make sure you have completed and submitted your registration details first before proceeding to verification and payment."
        supportingText="Registration and Google Form submission must be completed first. Payment and verification should only be done after submitting your details."
        imageUrl={registrationQrImageUrl}
        imageAlt={`${webinar.title} registration QR`}
        primaryActionLabel="I Already Submitted My Details"
        onPrimaryAction={() => {
          setIsRegistrationNoticeOpen(false);
          navigate(`/webinars/${webinar.slug}/register`);
        }}
      />
    </main>
  );
};

export default WebinarDetailPage;
