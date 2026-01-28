import { useEffect, useMemo, useState } from "react";
import Cards from "../../components/Cards";
import type EventCardData from "../../entities/EventCard";

const LatestEvents = () => {
  const [events, setEvents] = useState<EventCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/events");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: EventCardData[] = await res.json();
        if (!cancelled) setEvents(data);
      } catch (err) {
        console.error("Failed to load events", err);
        if (!cancelled) setError("Couldn't load events right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const latest = useMemo(
    () =>
      [...events]
        .filter((ev) => ev.event_date)
        .sort(
          (a, b) =>
            new Date(b.event_date as string).getTime() -
            new Date(a.event_date as string).getTime()
        )
        .slice(0, 3),
    [events]
  );

  if (loading)
    return (
      <section className="max-w-[1240px] mx-auto px-4 my-16">
        Loading latest webinars…
      </section>
    );
  if (error)
    return (
      <section className="max-w-[1240px] mx-auto px-4 my-16 text-red-600">
        {error}
      </section>
    );
  if (latest.length === 0) return null;

  return (
    <section className="max-w-[1240px] mx-auto px-4 my-24">
      <header className="text-center mb-10">
        <p className="headline-gradient text-lg font-text uppercase tracking-[0.05em] mb-3 font-bold">
          Up next
        </p>
        <h2 className="font-heading uppercase text-4xl">Latest Webinars</h2>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
        {latest.map((ev) => (
          <Cards key={ev.id} event={ev} />
        ))}
      </div>
    </section>
  );
};

export default LatestEvents;
