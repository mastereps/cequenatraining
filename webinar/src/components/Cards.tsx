import type EventCardData from "../entities/EventCard";

function formatTime(t: string | null) {
  if (!t) return null;
  const [hh, mm] = t.split(":");
  const hourNum = parseInt(hh, 10);
  const ampm = hourNum >= 12 ? "pm" : "am";
  const hour12 = hourNum % 12 === 0 ? 12 : hourNum % 12;
  return `${hour12}:${mm} ${ampm}`;
}

interface CardsProps {
  event: EventCardData;
}

const Cards: React.FC<CardsProps> = ({ event }) => {
  const formattedDate = event.event_date
    ? new Date(event.event_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const timeRange =
    event.start_time && event.end_time
      ? `${formatTime(event.start_time)} - ${formatTime(event.end_time)}`
      : null;

  const durationLabel =
    event.duration_hours != null ? `${Number(event.duration_hours)}hr` : null;
  //
  return (
    <div className="flex-1 max-w-sm border border-gray-200 rounded-lg shadow-sm bg-white dark:border-gray-700 flex flex-col overflow-hidden h-full ">
      {/* banner */}
      <a href={event.cta_url ?? "#"} target="_blank">
        <img
          className="rounded-t-lg w-full object-cover h-[250px]"
          src={event.banner_image_url}
          alt={event.title}
        />
      </a>

      <div className="p-5 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex-1 flex flex-col">
        {/* title row */}
        <div className="flex items-start justify-between gap-2">
          <a href={event.cta_url ?? "#"} target="_blank" className="flex-1">
            <h5 className="mb-2 text-2xl font-bold leading-snug text-slate-900 dark:text-slate-100">
              {event.title}
            </h5>
          </a>

          {durationLabel && (
            <span className="shrink-0 inline-block rounded-md bg-slate-900 dark:bg-slate-100 px-3 py-1   font-semibold text-slate-100 dark:text-slate-900">
              {durationLabel}
            </span>
          )}
        </div>

        {/* description */}
        <p className="mb-4 font-normal text-slate-900 dark:text-slate-100 text-lg leading-relaxed">
          {event.description}
        </p>

        {/* date/time */}
        {(formattedDate || timeRange) && (
          <div className="mb-4 text-slate-900 dark:text-slate-100 text-sm leading-relaxed">
            {formattedDate && <div>{formattedDate}</div>}
            {timeRange && <div>{timeRange}</div>}
          </div>
        )}

        {/* CTA button */}
        {/* {event.cta_label && (
          <a
            href={event.cta_url ?? "#"}
            target="_blank"
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800  "
          >
            {event.cta_label}
            <svg
              className="rtl:rotate-180 w-3.5 h-3.5 ms-2"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 14 10"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M1 5h12m0 0L9 1m4 4L9 9"
              />
            </svg>
          </a>
        )} */}
      </div>
    </div>
  );
};

export default Cards;
