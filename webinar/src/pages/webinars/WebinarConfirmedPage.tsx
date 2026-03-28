import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  fetchRegistrationStatus,
  fetchWebinarBySlug,
  submitWebinarPaymentProof,
} from "../../features/webinars/api";
import WebinarQrNoticeModal from "../../features/webinars/components/WebinarQrNoticeModal";
import {
  setSubmittedEmailForWebinar,
  setSubmittedPaymentMetaForWebinar,
  setSubmittedStatusForWebinar,
} from "../../features/webinars/registrationSession";
import type { RegistrationStatusResponse, Webinar } from "../../features/webinars/types";
import { formatManilaDateTime } from "../../features/webinars/format";
import { useAuth } from "../../store/AuthContext";
import { formatPrice } from "../../utils/formatPrice";

const digitsOnly = (value: string) => value.replace(/\D/g, "");

const formatGroupedDigits = (value: string, groups: number[]) => {
  const cleanValue = digitsOnly(value);
  const parts: string[] = [];
  let offset = 0;

  for (const groupSize of groups) {
    const part = cleanValue.slice(offset, offset + groupSize);
    if (!part) break;
    parts.push(part);
    offset += groupSize;
  }

  return parts.join(" ");
};

const formatGcashReferenceNumber = (value: string) =>
  formatGroupedDigits(digitsOnly(value).slice(0, 13), [4, 4, 5]);

const formatPhilippineMobileNumber = (value: string) =>
  formatGroupedDigits(digitsOnly(value).slice(0, 11), [4, 3, 4]);

const REQUIRED_REFERENCE_DIGITS = 13;
const REQUIRED_GCASH_DIGITS = 11;

const WebinarConfirmedPage = () => {
  const { slug = "" } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [registration, setRegistration] = useState<RegistrationStatusResponse | null>(null);
  const [email, setEmail] = useState(params.get("email") || "");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [payerName, setPayerName] = useState("");
  const [payerGcashNumber, setPayerGcashNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isPaymentQrModalOpen, setIsPaymentQrModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!email && user?.email) {
      setEmail(user.email);
    }
  }, [email, user]);

  useEffect(() => {
    if (!payerName && user?.name) {
      setPayerName(user.name);
    }
  }, [payerName, user]);

  useEffect(() => {
    if (!email) return;
    setSubmittedEmailForWebinar(slug, email);
  }, [slug, email]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const webinarResponse = await fetchWebinarBySlug(slug);
        if (!active) return;
        setWebinar(webinarResponse);

        if (!email && !user?.id) {
          setRegistration(null);
          return;
        }

        const status = await fetchRegistrationStatus(slug, {
          email: email || undefined,
          userId: user?.id ?? null,
        });

        if (!active) return;
        setRegistration(status);
        setSubmittedPaymentMetaForWebinar(slug, status.payment_required, status.payment_status);

        if (status.email) {
          setEmail(status.email);
          setSubmittedEmailForWebinar(slug, status.email);
        }

        if (status.status === "pending" || status.status === "verified") {
          setSubmittedStatusForWebinar(slug, status.status);
        }

        if (status.payment_proof) {
          setReferenceNumber(
            (current) =>
              current || digitsOnly(status.payment_proof?.reference_number || "").slice(0, 13),
          );
          setPayerName((current) => current || status.payment_proof?.payer_name || "");
          setPayerGcashNumber(
            (current) =>
              current || digitsOnly(status.payment_proof?.payer_gcash_number || "").slice(0, 11),
          );
        }
      } catch (loadError) {
        const errorMessage =
          loadError instanceof Error ? loadError.message : "Unable to load webinar.";
        if (active) setError(errorMessage);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [slug, email, user?.id]);

  const refreshStatus = async () => {
    const status = await fetchRegistrationStatus(slug, {
      email: email || undefined,
      userId: user?.id ?? null,
    });
    setRegistration(status);
    setSubmittedPaymentMetaForWebinar(slug, status.payment_required, status.payment_status);
    if (status.status === "pending" || status.status === "verified") {
      setSubmittedStatusForWebinar(slug, status.status);
    }
  };

  const handleSubmitProof = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const cleanReferenceNumber = digitsOnly(referenceNumber);
    const cleanPayerGcashNumber = digitsOnly(payerGcashNumber);

    if (cleanReferenceNumber.length !== REQUIRED_REFERENCE_DIGITS) {
      setError("GCash reference number must be exactly 13 digits.");
      setMessage(null);
      return;
    }

    if (cleanPayerGcashNumber.length !== REQUIRED_GCASH_DIGITS) {
      setError("GCash number must be exactly 11 digits.");
      setMessage(null);
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await submitWebinarPaymentProof(slug, {
        email: email || undefined,
        user_id: user?.id ?? null,
        reference_number: cleanReferenceNumber,
        payer_name: payerName,
        payer_gcash_number: cleanPayerGcashNumber,
      });

      setMessage(response.message);
      await refreshStatus();
    } catch (submitError) {
      const submitMessage =
        submitError instanceof Error ? submitError.message : "Unable to submit payment proof.";
      setError(submitMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <main className="mx-auto mt-28 max-w-[900px] px-4">Loading confirmation...</main>;
  }

  if (error && !webinar) {
    return (
      <main className="mx-auto mt-28 max-w-[900px] px-4">
        <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      </main>
    );
  }

  const isVerified = registration?.status === "verified";
  const isPaid = Boolean(
    isVerified &&
      (registration?.payment_required === false || registration?.payment_status === "paid"),
  );
  const paymentUnderReview = Boolean(isVerified && registration?.payment_status === "proof_submitted");
  const paymentRejected = Boolean(isVerified && registration?.payment_status === "rejected");
  const needsPaymentSubmission = Boolean(
    isVerified &&
      registration?.payment_required &&
      !isPaid &&
      registration?.payment_status !== "proof_submitted",
  );
  const zoomLinkSent = Boolean(registration?.zoom_link_sent_at);
  const referenceDigits = digitsOnly(referenceNumber);
  const gcashDigits = digitsOnly(payerGcashNumber);
  const isReferenceComplete = referenceDigits.length === REQUIRED_REFERENCE_DIGITS;
  const isGcashNumberComplete = gcashDigits.length === REQUIRED_GCASH_DIGITS;

  const statusTitle = isPaid
    ? zoomLinkSent
      ? "Zoom link sent"
      : "Payment approved"
    : paymentUnderReview
      ? "Payment under review"
      : needsPaymentSubmission
        ? paymentRejected
          ? "Payment rejected"
          : "Email verified"
        : registration?.status === "pending"
          ? "Verification pending"
          : "Registration status";

  const statusMessage = isPaid
    ? zoomLinkSent
      ? "Your Zoom link has already been sent by email."
      : "Your payment is approved. The Zoom link will be sent by email later."
    : paymentUnderReview
      ? "Your payment details were submitted successfully and are waiting for manual validation."
      : needsPaymentSubmission
        ? paymentRejected
          ? "Your previous payment submission was rejected. Please review your details and submit again."
          : "Your email is verified. Submit your GCash payment details below for manual review."
        : registration?.status === "pending"
          ? "Please verify your email first before submitting payment details."
          : "We could not confirm your registration state yet.";

  return (
    <main className="mx-auto mt-28 max-w-[900px] px-4 pb-20">
      <section
        className={`rounded-lg border p-6 ${
          isPaid
            ? "border-green-200 bg-green-50 text-green-900"
            : paymentUnderReview
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : "border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        }`}
      >
        <h1 className="font-heading text-4xl uppercase">{statusTitle}</h1>
        <p className="mt-3">{statusMessage}</p>
        {webinar ? (
          <div className="mt-4 text-sm">
            <p>
              <strong>{webinar.title}</strong>
            </p>
            <p>{formatManilaDateTime(webinar.start_at)}</p>
            {webinar.price_cents ? (
              <p className="mt-1">
                <strong>Amount:</strong> {formatPrice(webinar.price_cents, webinar.currency)}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      

      {needsPaymentSubmission && webinar ? (
        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <form
            onSubmit={handleSubmitProof}
            className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"
          >
            <h2 className="text-xl font-semibold uppercase tracking-[0.06em]">
              Submit payment details
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Pay the exact amount through GCash, then submit the details below. Your payment will
              be reviewed manually before approval.
            </p>

            <div className="mt-6">
              <label htmlFor="confirmed-email" className="mb-1 block text-sm font-semibold">
                Email address
              </label>
              <input
                id="confirmed-email"
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
              />
            </div>

            <div className="mt-4">
              <label htmlFor="reference-number" className="mb-1 block text-sm font-semibold">
                GCash reference number
              </label>
              <input
                id="reference-number"
                required
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={formatGcashReferenceNumber(referenceNumber)}
                onChange={(event) =>
                  setReferenceNumber(digitsOnly(event.target.value).slice(0, 13))
                }
                className="w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
                maxLength={15}
                placeholder="1234 5678 90123"
              />
              <p
                className={`mt-1 text-xs ${
                  referenceDigits.length > 0 && !isReferenceComplete
                    ? "text-red-600"
                    : "text-slate-500 dark:text-slate-300"
                }`}
              >
                13 digits required.
              </p>
            </div>

            <div className="mt-4">
              <label htmlFor="payer-name" className="mb-1 block text-sm font-semibold">
                Payer name
              </label>
              <input
                id="payer-name"
                required
                value={payerName}
                onChange={(event) => setPayerName(event.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
                placeholder="Full name used in GCash"
              />
            </div>

            <div className="mt-4">
              <label htmlFor="payer-gcash-number" className="mb-1 block text-sm font-semibold">
                GCash number
              </label>
              <input
                id="payer-gcash-number"
                required
                type="text"
                inputMode="numeric"
                autoComplete="tel"
                value={formatPhilippineMobileNumber(payerGcashNumber)}
                onChange={(event) =>
                  setPayerGcashNumber(digitsOnly(event.target.value).slice(0, 11))
                }
                className="w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
                maxLength={13}
                placeholder="09XX XXX XXXX"
              />
              <p
                className={`mt-1 text-xs ${
                  gcashDigits.length > 0 && !isGcashNumberComplete
                    ? "text-red-600"
                    : "text-slate-500 dark:text-slate-300"
                }`}
              >
                11 digits required.
              </p>
            </div>

            {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
            {message ? <p className="mt-4 text-sm text-green-700">{message}</p> : null}

            <button
              type="submit"
              disabled={
                submitting ||
                !isReferenceComplete ||
                !isGcashNumberComplete ||
                payerName.trim().length < 2 ||
                !email.trim()
              }
              className="mt-6 rounded bg-[#00a34a] px-6 py-3 text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Submitting..." : paymentRejected ? "Resubmit payment" : "Submit payment"}
            </button>
          </form>

          <aside className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-emerald-950">
            <h2 className="text-xl font-semibold uppercase tracking-[0.06em]">
              GCash payment QR
            </h2>
            <p className="mt-2 text-sm leading-6">
              Review the registration reminder first, then open the QR modal to pay the exact
              amount.
            </p>
            <button
              type="button"
              onClick={() => setIsPaymentQrModalOpen(true)}
              className="mt-4 w-full rounded-xl bg-[#00a34a] px-5 py-3 text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
            >
              View GCash QR
            </button>
            <div className="mt-4 rounded-xl border border-emerald-200 bg-white/85 p-4 text-sm leading-6">
              <p className="font-semibold text-emerald-900">Can&apos;t scan the QR?</p>
              <p className="mt-1 text-emerald-950">
                You can send the payment manually to this GCash number:
              </p>
              <p className="mt-2 text-base font-bold tracking-[0.08em] text-emerald-900">
                0939 917 1705
              </p>
            </div>
            {webinar.payment_instructions ? (
              <div className="mt-4 whitespace-pre-line rounded-xl bg-white/80 p-4 text-sm leading-6">
                {webinar.payment_instructions}
              </div>
            ) : null}
          </aside>
        </section>
      ) : null}

      {webinar?.poster_image_url ? (
        <section className="mt-6 rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,rgba(248,250,252,0.96),rgba(233,246,239,0.72))] p-5 shadow-sm dark:border-slate-700 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.94),rgba(6,78,59,0.35))] sm:p-6">
          <div className="flex justify-center">
            <div className="w-full max-w-[440px] overflow-hidden rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-950">
              <img
                src={webinar.poster_image_url}
                alt={webinar.title}
                className="h-auto w-full rounded-[18px] object-contain"
              />
            </div>
          </div>
        </section>
      ) : null}

      {paymentUnderReview && registration?.payment_proof ? (
        <section className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-950">
          <h2 className="text-xl font-semibold uppercase tracking-[0.06em]">Submitted payment</h2>
          <div className="mt-4 space-y-2 text-sm">
            <p>
              <strong>Reference number:</strong> {registration.payment_proof.reference_number}
            </p>
            <p>
              <strong>Payer name:</strong> {registration.payment_proof.payer_name}
            </p>
            <p>
              <strong>GCash number:</strong> {registration.payment_proof.payer_gcash_number}
            </p>
            {registration.payment_proof.submitted_at ? (
              <p>
                <strong>Submitted:</strong> {formatManilaDateTime(registration.payment_proof.submitted_at)}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {isPaid && webinar?.join_link_delivery_mode === "manual" ? (
        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <h2 className="text-xl font-semibold uppercase tracking-[0.06em]">Next step</h2>
          <p className="mt-3 text-sm leading-6">
            Your registration is complete. The organizer will send the Zoom link to your email in a
            separate batch once everything is ready.
          </p>
        </section>
      ) : null}

      {registration?.status === "pending" ? (
        <section className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-950">
          <p className="text-sm leading-6">
            You still need to verify your email before payment instructions become active.
          </p>
        </section>
      ) : null}

      {error && webinar ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {message && !needsPaymentSubmission ? <p className="mt-4 text-sm text-green-700">{message}</p> : null}

      {webinar ? (
        <WebinarQrNoticeModal
          open={isPaymentQrModalOpen}
          onClose={() => setIsPaymentQrModalOpen(false)}
          heading="Registration Required Before Payment"
          notice="Please make sure you have completed and submitted your registration details first before proceeding to verification and payment."
          supportingText="Registration and Google Form submission must be completed first. Payment and verification should only be done after submitting your details."
          imageUrl={webinar.payment_qr_image_url}
          imageAlt={`${webinar.title} GCash QR`}
          primaryActionLabel="I Already Submitted My Details"
          onPrimaryAction={() => setIsPaymentQrModalOpen(false)}
        >
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm leading-6 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-100">
            <p className="font-semibold uppercase tracking-[0.12em]">Payment note</p>
            <p className="mt-2">
              Pay the exact webinar amount and submit the reference number, payer name, and GCash
              number in the form after closing this modal.
            </p>
            {webinar.payment_instructions ? (
              <div className="mt-3 whitespace-pre-line rounded-xl bg-white/80 p-3 dark:bg-slate-950/60">
                {webinar.payment_instructions}
              </div>
            ) : null}
          </div>
        </WebinarQrNoticeModal>
      ) : null}

      <div className="mt-6">
        <Link to="/webinars" className="text-sm font-semibold underline">
          Back to webinars
        </Link>
      </div>
    </main>
  );
};

export default WebinarConfirmedPage;
