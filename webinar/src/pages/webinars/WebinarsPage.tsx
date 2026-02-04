import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { fetchRegistrationStatus, fetchWebinars } from "../../features/webinars/api";
import {
  clearSubmittedEmailForWebinar,
  getSubmittedEmailForWebinar,
  setSubmittedEmailForWebinar,
} from "../../features/webinars/registrationSession";
import type { Webinar } from "../../features/webinars/types";
import WebinarCard from "../../features/webinars/components/WebinarCard";
import { useAuth } from "../../store/AuthContext";

const TOPIC_OPTIONS = [
  "Research & Publication",
  "Digital Learning",
  "Classroom Strategies",
  "General",
];

const WebinarsPage = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [topic, setTopic] = useState("");
  const [availability, setAvailability] = useState("");
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const syncSubmittedLocks = async (data: Webinar[]) => {
    await Promise.all(
      data.map(async (webinar) => {
        if (user) {
          try {
            const status = await fetchRegistrationStatus(webinar.slug, {
              userId: user.id,
              email: user.email,
            });
            if (status.registered) {
              setSubmittedEmailForWebinar(webinar.slug, status.email || user.email);
            } else {
              clearSubmittedEmailForWebinar(webinar.slug);
            }
            return;
          } catch {
            // Fallback to session lock check below.
          }
        }

        const submittedEmail = getSubmittedEmailForWebinar(webinar.slug);
        if (!submittedEmail) return;

        try {
          const status = await fetchRegistrationStatus(webinar.slug, { email: submittedEmail });
          if (!status.registered) {
            clearSubmittedEmailForWebinar(webinar.slug);
          }
        } catch {
          clearSubmittedEmailForWebinar(webinar.slug);
        }
      }),
    );
  };

  const loadWebinars = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWebinars({
        search,
        from,
        to,
        topic,
        availability,
      });
      await syncSubmittedLocks(data);
      setWebinars(data);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "Failed to load webinars.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWebinars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleFilterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void loadWebinars();
  };

  const resultCountLabel = useMemo(() => {
    if (loading) return "Loading webinars...";
    if (webinars.length === 0) return "No webinars found.";
    if (webinars.length === 1) return "1 webinar found.";
    return `${webinars.length} webinars found.`;
  }, [loading, webinars.length]);

  return (
    <main className="mx-auto mt-28 max-w-[1240px] px-4 pb-20">
      <header className="mb-10 text-center">
        <p className="headline-gradient mb-2 font-text text-lg font-bold uppercase tracking-[0.08em]">
          Upcoming sessions
        </p>
        <h1 className="font-heading text-5xl uppercase">Webinars</h1>
        <p className="mt-4 text-slate-600 dark:text-slate-300">
          Browse and reserve your seat. All schedules are displayed in Asia/Manila time.
        </p>
      </header>

      <form
        onSubmit={handleFilterSubmit}
        className="mb-6 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 md:grid-cols-2 lg:grid-cols-6"
      >
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          placeholder="Search webinar"
          aria-label="Search webinar"
        />
        <input
          type="date"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          className="rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          aria-label="From date"
        />
        <input
          type="date"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          className="rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          aria-label="To date"
        />
        <select
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          className="rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          aria-label="Topic"
        >
          <option value="">All topics</option>
          {TOPIC_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          value={availability}
          onChange={(event) => setAvailability(event.target.value)}
          className="rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          aria-label="Availability"
        >
          <option value="">All availability</option>
          <option value="open">Open</option>
          <option value="full">Full</option>
        </select>
        <button
          type="submit"
          className="rounded bg-slate-900 px-3 py-2 font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
        >
          Apply filters
        </button>
      </form>

      <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">{resultCountLabel}</p>

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      ) : null}

      {!loading && !error ? (
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {webinars.map((webinar) => (
            <WebinarCard key={webinar.id} webinar={webinar} />
          ))}
        </section>
      ) : null}
    </main>
  );
};

export default WebinarsPage;
