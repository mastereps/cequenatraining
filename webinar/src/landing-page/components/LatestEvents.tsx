import { useEffect, useState } from "react";
import { fetchRegistrationStatus, fetchWebinars } from "../../features/webinars/api";
import {
  clearSubmittedEmailForWebinar,
  getSubmittedEmailForWebinar,
  setSubmittedEmailForWebinar,
} from "../../features/webinars/registrationSession";
import type { Webinar } from "../../features/webinars/types";
import WebinarCard from "../../features/webinars/components/WebinarCard";
import { useAuth } from "../../store/AuthContext";

const LatestEvents = () => {
  const { user } = useAuth();
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

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchWebinars({ availability: "open", limit: 3 });
        const latest = response.slice(0, 3);
        await syncSubmittedLocks(latest);
        if (active) {
          setWebinars(latest);
        }
      } catch (loadError) {
        const message =
          loadError instanceof Error ? loadError.message : "Couldn't load webinars right now.";
        if (active) {
          setError(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [user]);

  if (loading) {
    return <section className="mx-auto my-16 max-w-[1240px] px-4">Loading latest webinars...</section>;
  }

  if (error) {
    return (
      <section className="mx-auto my-16 max-w-[1240px] px-4 text-red-600">
        {error}
      </section>
    );
  }

  if (webinars.length === 0) return null;

  return (
    <section className="mx-auto my-24 max-w-[1240px] px-4">
      <header className="mb-10 text-center">
        <p className="headline-gradient mb-3 font-text text-lg font-bold uppercase tracking-[0.05em]">
          Up next
        </p>
        <h2 className="font-heading text-4xl uppercase">Latest Webinars</h2>
      </header>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {webinars.map((webinar) => (
          <WebinarCard key={webinar.id} webinar={webinar} />
        ))}
      </div>
    </section>
  );
};

export default LatestEvents;
