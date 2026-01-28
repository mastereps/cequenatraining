import { useRef, useState } from "react";

interface Props {
  onSearch: (searchText: string) => void;
  topic: string;
  onTopicChange: (topic: string) => void;
  order: string;
  onOrderChange: (order: string) => void;
}

const TOPIC_OPTIONS = [
  "All",
  "Research & Publication",
  "Digital Learning",
  "Classroom Strategies",
  "Social-Emotional Learning",
  "Curriculum Design",
];

const ORDER_OPTIONS: { value: string; label: string }[] = [
  { value: "dateAsc", label: "Date (soonest)" },
  { value: "dateDesc", label: "Date (latest)" },
  { value: "titleAsc", label: "Title (A-Z)" },
  { value: "durationAsc", label: "Duration (short->long)" },
  { value: "durationDesc", label: "Duration (long->short)" },
];

const SearchInput = ({
  onSearch,
  topic,
  onTopicChange,
  order,
  onOrderChange,
}: Props) => {
  const [openTopic, setOpenTopic] = useState(false);
  const [openOrder, setOpenOrder] = useState(false);

  const ref = useRef<HTMLInputElement>(null);

  const orderLabel =
    ORDER_OPTIONS.find((o) => o.value === order)?.label ?? "Date (soonest)";

  return (
    <>
      <div className="max-w-[1240px] mx-auto my-14 search-webinar px-4">
        <h1 className="bg-[#232323] text-4xl font-extrabold text-slate-900 dark:text-slate-100 mb-4">
          {topic === "All" ? "Webinars" : `${topic} Webinars`}
        </h1>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            {/* Topic dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setOpenTopic(!openTopic);
                  setOpenOrder(false);
                }}
                className="text-slate-700 dark:text-slate-100 bg-white-700 hover:bg-[#fbf9ff] focus:outline-none cursor-pointer shadow-sm font-medium rounded-sm text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                {topic === "All" ? "Topic" : topic}
                <svg
                  className="w-2.5 h-2.5 ms-3"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 10 6"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="m1 1 4 4 4-4"
                  />
                </svg>
              </button>
              <div
                className={
                  `absolute left-0 top-[42px] z-10 bg-white rounded-sm shadow-sm w-60 dark:bg-gray-700 ` +
                  (openTopic ? "block" : "hidden")
                }
              >
                <ul className="py-2 text-sm text-gray-700 dark:text-gray-200">
                  {TOPIC_OPTIONS.map((opt) => (
                    <li key={opt}>
                      <button
                        className="w-full text-left block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                        onClick={() => {
                          onTopicChange(opt);
                          setOpenTopic(false);
                        }}
                      >
                        {opt}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Order dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setOpenOrder(!openOrder);
                  setOpenTopic(false);
                }}
                className="text-slate-700 dark:text-slate-100 bg-white-700 hover:bg-[#fbf9ff] focus:outline-none cursor-pointer shadow-sm font-medium rounded-sm text-sm px-5 py-2.5 text-center inline-flex items-center dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                {`Order by: ${orderLabel}`}
                <svg
                  className="w-2.5 h-2.5 ms-3"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 10 6"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="m1 1 4 4 4-4"
                  />
                </svg>
              </button>
              <div
                className={
                  `absolute left-0 top-[42px] z-10 bg-white rounded-sm shadow-sm w-56 dark:bg-gray-700 ` +
                  (openOrder ? "block" : "hidden")
                }
              >
                <ul className="py-2 text-sm text-gray-700 dark:text-gray-200">
                  {ORDER_OPTIONS.map((opt) => (
                    <li key={opt.value}>
                      <button
                        className="w-full text-left block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"
                        onClick={() => {
                          onOrderChange(opt.value);
                          setOpenOrder(false);
                        }}
                      >
                        {opt.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Search */}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (ref.current) onSearch(ref.current.value);
            }}
            className="w-[320px]"
          >
            <label
              htmlFor="default-search"
              className="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white"
            >
              Search
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                <svg
                  className="w-4 h-4 text-gray-500 dark:text-gray-400"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 20 20"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
                  />
                </svg>
              </div>
              <input
                ref={ref}
                type="search"
                id="default-search"
                className="block w-full p-[10px] ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 outline-slate-300"
                placeholder="Search Webinars ..."
              />
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default SearchInput;
