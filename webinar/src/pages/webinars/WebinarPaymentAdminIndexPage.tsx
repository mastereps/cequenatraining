import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchWebinars } from "../../features/webinars/api";
import type { Webinar } from "../../features/webinars/types";
import { formatManilaDateTime } from "../../features/webinars/format";
import { formatPrice } from "../../utils/formatPrice";
import { useAuth } from "../../store/AuthContext";
import { isAdminUser } from "../../features/auth/roles";

const WebinarPaymentAdminIndexPage = () => {
  const { user } = useAuth();
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = isAdminUser(user);

  useEffect(() => {
    if (!isAdmin) return;

    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchWebinars({ limit: 100 });
        if (active) setWebinars(data);
      } catch (loadError) {
        const message =
          loadError instanceof Error ? loadError.message : "Unable to load webinar payment reviews.";
        if (active) setError(message);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-[960px] px-4 pb-20">
        <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">
          Admin access is required.
        </div>
      </main>
    );
  }

  if (loading) {
    return <main className="mx-auto max-w-[1100px] px-4">Loading payment review index...</main>;
  }

  return (
    <main className="mx-auto max-w-[1100px] px-4 pb-20">
      <header className="mb-8">
        <p className="headline-gradient mb-2 font-text text-lg font-bold uppercase tracking-[0.08em]">
          Admin review
        </p>
        <h1 className="font-heading text-4xl uppercase">Webinar payment reviews</h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          Open any webinar below to review submitted payment proofs and send Zoom links.
        </p>
      </header>

      {error ? (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      ) : null}

      {webinars.length === 0 ? (
        <div className="rounded border border-slate-200 bg-white p-6 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          No webinars are currently available for payment review.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {webinars.map((webinar) => {
            const priceCents = Number(webinar.price_cents ?? 0);
            const feeLabel =
              priceCents > 0 ? formatPrice(priceCents, webinar.currency) : "Free webinar";

            return (
              <section
                key={webinar.id}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  {webinar.topic}
                </p>
                <h2 className="mt-3 font-heading text-3xl uppercase text-slate-950 dark:text-white">
                  {webinar.title}
                </h2>
                <div className="mt-4 space-y-1 text-sm text-slate-700 dark:text-slate-200">
                  <p>{formatManilaDateTime(webinar.start_at)}</p>
                  <p>
                    <strong>Fee:</strong> {feeLabel}
                  </p>
                  <p>
                    <strong>Availability:</strong> {webinar.available_seats ?? "Unlimited"} seats
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    to={`/admin/webinars/${webinar.slug}/payments`}
                    className="rounded bg-[#00a34a] px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
                  >
                    Review payments
                  </Link>
                  <Link
                    to={`/webinars/${webinar.slug}`}
                    className="rounded border border-slate-300 px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Open webinar
                  </Link>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
};

export default WebinarPaymentAdminIndexPage;
