import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { fetchWebinarBySlug, resendConfirmationEmail } from "../../features/webinars/api";
import type { Webinar } from "../../features/webinars/types";
import { formatManilaDateTime } from "../../features/webinars/format";

const WebinarConfirmedPage = () => {
  const { slug = "" } = useParams();
  const [params] = useSearchParams();
  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [email, setEmail] = useState(params.get("email") || "");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const response = await fetchWebinarBySlug(slug);
        if (active) setWebinar(response);
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
  }, [slug]);

  const handleResend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setError(null);
    setMessage(null);

    try {
      const response = await resendConfirmationEmail(slug, email);
      setMessage(response.message);
    } catch (resendError) {
      const resendMessage =
        resendError instanceof Error ? resendError.message : "Unable to resend email.";
      setError(resendMessage);
    } finally {
      setSending(false);
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
      <section className="rounded-lg border border-green-200 bg-green-50 p-6 text-green-900">
        <h1 className="font-heading text-4xl uppercase">You are confirmed</h1>
        <p className="mt-3">
          Your webinar registration is verified. Check your inbox for the join link.
        </p>
        {webinar ? (
          <p className="mt-2 text-sm">
            <strong>{webinar.title}</strong> - {formatManilaDateTime(webinar.start_at)}
          </p>
        ) : null}
      </section>

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

        <button
          type="submit"
          disabled={sending}
          className="mt-4 rounded bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
        >
          {sending ? "Sending..." : "Resend email"}
        </button>
      </form>

      <div className="mt-4">
        <Link to="/webinars" className="text-sm font-semibold underline">
          Back to webinars
        </Link>
      </div>
    </main>
  );
};

export default WebinarConfirmedPage;
