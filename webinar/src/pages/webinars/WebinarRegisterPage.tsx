import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchWebinarBySlug, registerWebinar } from "../../features/webinars/api";
import type { Webinar } from "../../features/webinars/types";

const WebinarRegisterPage = () => {
  const { slug = "" } = useParams();
  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [role, setRole] = useState("");

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
          loadError instanceof Error ? loadError.message : "Failed to load webinar.";
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await registerWebinar(slug, {
        full_name: fullName,
        email,
        optional_fields: {
          organization,
          role,
        },
      });
      setSuccessMessage(response.message);
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Unable to register.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <main className="mx-auto mt-28 max-w-[720px] px-4">Loading form...</main>;
  }

  if (!webinar) {
    return (
      <main className="mx-auto mt-28 max-w-[720px] px-4">
        <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">
          {error || "Webinar not found."}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto mt-28 max-w-[720px] px-4 pb-20">
      <h1 className="font-heading text-5xl uppercase">Reserve my spot</h1>
      <p className="mt-3 text-slate-700 dark:text-slate-200">
        You are registering for <strong>{webinar.title}</strong>.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-4 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"
      >
        <div>
          <label htmlFor="full-name" className="mb-1 block text-sm font-semibold">
            Full name
          </label>
          <input
            id="full-name"
            required
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
            placeholder="Your full name"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-semibold">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label htmlFor="organization" className="mb-1 block text-sm font-semibold">
            Organization (optional)
          </label>
          <input
            id="organization"
            value={organization}
            onChange={(event) => setOrganization(event.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          />
        </div>
        <div>
          <label htmlFor="role" className="mb-1 block text-sm font-semibold">
            Role (optional)
          </label>
          <input
            id="role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {successMessage ? <p className="text-sm text-green-700">{successMessage}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-lantern px-6 py-3 font-text text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:bg-lantern/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Reserve my spot"}
        </button>

        <p className="text-sm text-slate-500 dark:text-slate-300">
          After submitting, check your email and verify your registration to confirm.
        </p>
      </form>

      <div className="mt-4">
        <Link
          to={`/webinars/${webinar.slug}`}
          className="text-sm font-semibold text-slate-700 underline dark:text-slate-200"
        >
          Back to webinar details
        </Link>
      </div>
    </main>
  );
};

export default WebinarRegisterPage;
