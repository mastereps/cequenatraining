import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  createWebinarPaymentSession,
  fetchRegistrationStatus,
  fetchWebinarBySlug,
  resendConfirmationEmail,
} from "../../features/webinars/api";
import {
  setSubmittedEmailForWebinar,
  setSubmittedStatusForWebinar,
} from "../../features/webinars/registrationSession";
import type { RegistrationStatusResponse, Webinar } from "../../features/webinars/types";
import { formatManilaDateTime } from "../../features/webinars/format";
import { useAuth } from "../../store/AuthContext";
import { formatPrice } from "../../utils/formatPrice";

const formatCooldown = (seconds: number) => {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(wholeSeconds / 60);
  const remainderSeconds = wholeSeconds % 60;
  return `${minutes}:${String(remainderSeconds).padStart(2, "0")}`;
};

const getRetryAfterSeconds = (error: unknown) => {
  if (!(error instanceof Error)) return 0;

  const candidate = Number(
    (error as Error & { retryAfterSeconds?: number }).retryAfterSeconds || 0,
  );
  if (!Number.isFinite(candidate) || candidate <= 0) return 0;
  return Math.ceil(candidate);
};

const WebinarConfirmedPage = () => {
  const { slug = "" } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [registration, setRegistration] = useState<RegistrationStatusResponse | null>(null);
  const [email, setEmail] = useState(params.get("email") || "");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!email && user?.email) {
      setEmail(user.email);
    }
  }, [email, user]);

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

        if (status.email) {
          setEmail(status.email);
          setSubmittedEmailForWebinar(slug, status.email);
        }

        if (status.status === "pending" || status.status === "verified") {
          setSubmittedStatusForWebinar(slug, status.status);
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

  useEffect(() => {
    if (resendCooldownSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setResendCooldownSeconds((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [resendCooldownSeconds]);

  const isVerified = registration?.status === "verified";
  const isPaid = Boolean(
    isVerified &&
      (registration?.payment_required === false || registration?.payment_status === "paid"),
  );
  const paymentPending = Boolean(isVerified && !isPaid);

  const paymentAttempt = useMemo(() => params.get("payment"), [params]);
  const statusTitle = isPaid
    ? "You are confirmed"
    : paymentPending
      ? "Verified, payment pending"
      : registration?.status === "pending"
        ? "Verification pending"
        : "Registration status";
  const statusMessage = isPaid
    ? "Your webinar registration is verified and paid. Check your inbox for the Zoom join link."
    : paymentPending
      ? "Your email is verified. Complete payment to receive your confirmation email with the Zoom join link."
      : registration?.status === "pending"
        ? "Please verify your email first before completing payment."
        : "We could not confirm your registration state yet.";

  const handleResend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isPaid) {
      setError("Confirmation email is available only after successful payment.");
      return;
    }
    if (resendCooldownSeconds > 0) {
      setError(
        `Please wait ${formatCooldown(resendCooldownSeconds)} before requesting another email.`,
      );
      return;
    }

    setSending(true);
    setError(null);
    setMessage(null);

    try {
      const response = await resendConfirmationEmail(slug, email);
      setMessage(response.message);
      setResendCooldownSeconds(Math.max(0, Math.floor(response.next_allowed_in_seconds || 0)));
    } catch (resendError) {
      const retryAfterSeconds = getRetryAfterSeconds(resendError);
      if (retryAfterSeconds > 0) {
        setResendCooldownSeconds(retryAfterSeconds);
      }
      const resendMessage =
        resendError instanceof Error ? resendError.message : "Unable to resend email.";
      setError(resendMessage);
    } finally {
      setSending(false);
    }
  };

  const handlePayNow = async () => {
    if (!paymentPending || paying) return;

    setPaying(true);
    setError(null);
    setMessage(null);

    try {
      const response = await createWebinarPaymentSession(slug, {
        email: email || undefined,
        user_id: user?.id,
      });

      if (response.checkout_url) {
        window.location.href = response.checkout_url;
        return;
      }

      setMessage(response.message);
      if (response.payment_status === "paid") {
        const refreshed = await fetchRegistrationStatus(slug, {
          email: email || undefined,
          userId: user?.id ?? null,
        });
        setRegistration(refreshed);
      }
    } catch (paymentError) {
      const paymentMessage =
        paymentError instanceof Error ? paymentError.message : "Unable to start payment.";
      setError(paymentMessage);
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return <main className="mx-auto mt-28 max-w-[720px] px-4">Loading confirmation...</main>;
  }

  if (error && !webinar) {
    return (
      <main className="mx-auto mt-28 max-w-[720px] px-4">
        <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      </main>
    );
  }

  return (
    <main className="mx-auto mt-28 max-w-[720px] px-4 pb-20">
      <section
        className={`rounded-lg border p-6 ${
          isPaid
            ? "border-green-200 bg-green-50 text-green-900"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        <h1 className="font-heading text-4xl uppercase">
          {statusTitle}
        </h1>
        <p className="mt-3">{statusMessage}</p>
        {webinar ? (
          <p className="mt-2 text-sm">
            <strong>{webinar.title}</strong> - {formatManilaDateTime(webinar.start_at)}
          </p>
        ) : null}
        {!isPaid && webinar?.price_cents ? (
          <p className="mt-2 text-sm">
            <strong>Amount:</strong> {formatPrice(webinar.price_cents, webinar.currency)}
          </p>
        ) : null}
        {!isPaid && paymentAttempt === "cancel" ? (
          <p className="mt-2 text-sm">Payment was canceled. You can try again anytime.</p>
        ) : null}

        {!isPaid ? (
          <div className="mt-6">
            <button
              type="button"
              onClick={handlePayNow}
              disabled={paying || !paymentPending}
              className="rounded bg-[#00a34a] px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {paying ? "Redirecting..." : "Pay now"}
            </button>
          </div>
        ) : null}
      </section>

      {isPaid ? (
        <form
          onSubmit={handleResend}
          className="mt-6 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"
        >
          <h2 className="text-lg font-semibold">Resend confirmation email</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            If you did not receive your email, you can request another copy.
          </p>
          <label htmlFor="confirmed-email" className="mt-4 block text-sm font-semibold">
            Email address
          </label>
          <input
            id="confirmed-email"
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          />

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          {message ? <p className="mt-3 text-sm text-green-700">{message}</p> : null}
          {resendCooldownSeconds > 0 ? (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">
              You can resend again in {formatCooldown(resendCooldownSeconds)}.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={sending || resendCooldownSeconds > 0}
            className="mt-4 rounded bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          >
            {sending
              ? "Sending..."
              : resendCooldownSeconds > 0
                ? `Resend in ${formatCooldown(resendCooldownSeconds)}`
                : "Resend email"}
          </button>
        </form>
      ) : (
        <>
          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
          {message ? <p className="mt-4 text-sm text-green-700">{message}</p> : null}
        </>
      )}

      <div className="mt-4">
        <Link to="/webinars" className="text-sm font-semibold underline">
          Back to webinars
        </Link>
      </div>
    </main>
  );
};

export default WebinarConfirmedPage;
