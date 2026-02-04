import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { fetchWebinarBySlug } from "../../features/webinars/api";
import {
  getSubmittedEmailForWebinar,
  setSubmittedEmailForWebinar,
} from "../../features/webinars/registrationSession";
import type { Webinar } from "../../features/webinars/types";

const WebinarSubmittedPage = () => {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const submittedEmail = params.get("email") || getSubmittedEmailForWebinar(slug) || "";

  useEffect(() => {
    if (!submittedEmail) {
      navigate(`/webinars/${slug}/register`, { replace: true });
      return;
    }

    setSubmittedEmailForWebinar(slug, submittedEmail);

    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchWebinarBySlug(slug);
        if (active) setWebinar(response);
      } catch (loadError) {
        const message =
          loadError instanceof Error ? loadError.message : "Unable to load webinar details.";
        if (active) setError(message);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [navigate, slug, submittedEmail]);

  if (loading) {
    return <main className="mx-auto mt-28 max-w-[720px] px-4">Loading confirmation...</main>;
  }

  return (
    <main className="mx-auto mt-28 max-w-[780px] px-4 pb-20">
      <section className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50 via-lime-50 to-white p-8 text-center shadow-sm">
        <div className="absolute -top-8 left-8 h-14 w-14 rounded-full bg-emerald-200/50 blur-xl" />
        <div className="absolute right-10 top-12 h-12 w-12 rounded-full bg-amber-200/60 blur-lg" />
        <div className="absolute bottom-12 left-12 h-10 w-10 rounded-full bg-sky-200/60 blur-lg" />
        <div className="absolute bottom-6 right-8 h-14 w-14 rounded-full bg-rose-200/50 blur-xl" />

        <h1 className="relative font-heading text-5xl uppercase leading-tight text-emerald-700">
          Registration successful
        </h1>

        <div className="relative mx-auto mt-6 flex h-44 w-44 items-center justify-center rounded-full bg-emerald-600 shadow-lg shadow-emerald-500/25">
          <span className="text-8xl font-black text-white">{"\u2713"}</span>
        </div>

        <p className="relative mt-6 text-lg font-semibold text-emerald-900">
          Your seat is reserved. Check your email to verify your registration.
        </p>
        <p className="relative mt-2 text-sm text-emerald-800">
          Confirmation sent to <strong>{submittedEmail}</strong>
        </p>
        {webinar ? (
          <p className="relative mt-2 text-sm text-emerald-800">
            Webinar: <strong>{webinar.title}</strong>
          </p>
        ) : null}
        {error ? <p className="relative mt-3 text-sm text-red-700">{error}</p> : null}

        <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to={`/webinars/${slug}`}
            className="rounded bg-emerald-700 px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-emerald-800"
          >
            Webinar details
          </Link>
          <Link
            to="/webinars"
            className="rounded border border-emerald-500 px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-emerald-700 transition hover:bg-emerald-100"
          >
            Browse webinars
          </Link>
        </div>
      </section>
    </main>
  );
};

export default WebinarSubmittedPage;
