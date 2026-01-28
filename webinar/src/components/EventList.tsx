import { useEffect, useMemo, useState } from "react";
import Cards from "./Cards";
import type EventCardData from "../entities/EventCard";

interface Props {
  searchText: string;
  topic: string;
  order: string; // dateAsc | dateDesc | titleAsc | durationAsc | durationDesc
}

const EventsList: React.FC<Props> = ({ searchText, topic, order }) => {
  const [events, setEvents] = useState<EventCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch("/api/events");
        if (!res.ok) {
          console.error("Failed to fetch events", res.status);
          setError(`Failed to fetch events (HTTP ${res.status})`);
          return;
        }

        const data: EventCardData[] = await res.json();
        setEvents(data);
      } catch (err) {
        console.error("Network error:", err);
        setError("Network error while loading events");
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  function inferTopic(ev: EventCardData): string {
    const text = `${ev.title} ${ev.description}`.toLowerCase();
    if (/(social\s*-?emotional|sel)/i.test(text)) return "Social-Emotional Learning";
    if (/(research|publication|writing|publish)/i.test(text)) return "Research & Publication";
    if (/(digital|online|platform|edtech|technology)/i.test(text)) return "Digital Learning";
    if (/(strategy|strategies|classroom|tips|tricks)/i.test(text)) return "Classroom Strategies";
    if (/(curriculum|design)/i.test(text)) return "Curriculum Design";
    return "Other";
  }

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const bySearch = q
      ? events.filter((ev) => ev.title.toLowerCase().includes(q))
      : events;

    const byTopic = topic && topic !== "All"
      ? bySearch.filter((ev) => inferTopic(ev) === topic)
      : bySearch;

    const sorted = [...byTopic];
    const toTime = (d: string | null) => (d ? new Date(d).getTime() : Number.POSITIVE_INFINITY);
    const toNum = (n: number | null) => (n ?? Number.POSITIVE_INFINITY);

    switch (order) {
      case "dateAsc":
        sorted.sort((a, b) => toTime(a.event_date) - toTime(b.event_date));
        break;
      case "dateDesc":
        sorted.sort((a, b) => toTime(b.event_date) - toTime(a.event_date));
        break;
      case "titleAsc":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "durationAsc":
        sorted.sort((a, b) => toNum(a.duration_hours) - toNum(b.duration_hours));
        break;
      case "durationDesc":
        sorted.sort((a, b) => toNum(b.duration_hours) - toNum(a.duration_hours));
        break;
      default:
        break;
    }

    return sorted;
  }, [events, searchText, topic, order]);

  if (loading) {
    return (
      <section className="cards text-gray-500 dark:text-gray-400">
        Loading...
      </section>
    );
  }

  if (error) {
    return (
      <section className="cards text-red-600 dark:text-red-400">
        {error}
      </section>
    );
  }

  return (
    <section className="max-w-[1240px] mx-auto cards">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-[16px] justify-items-center">
        {filtered.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400 text-6xl text-center w-full col-span-3">
            No webinars found.
          </div>
        ) : (
          filtered.map((ev) => <Cards key={ev.id} event={ev} />)
        )}
      </div>
    </section>
  );
};

export default EventsList;
