import MariaPhoto from "../../assets/images/maria_ophoto.jpg";
import type { SectionContent } from "../../features/content/types";
import { pickList, pickString } from "../../features/content/helpers";

type Stat = { value: string; label: string };

// Per-stat accent colors kept in code (structural styling, not content).
const STAT_ACCENTS = [
  { text: "text-[#9e7cff]", via: "before:via-[#9e7cff]" },
  { text: "text-lantern", via: "before:via-lantern" },
  { text: "text-[rgb(255,95,204)]", via: "before:via-[rgb(255,95,204)]" },
  { text: "text-[rgb(255,159,36)]", via: "before:via-[rgb(255,159,36)]" },
];

const DEFAULT_STATS: Stat[] = [
  { value: "1000+", label: "Teachers trained" },
  { value: "30+", label: "Years of teaching experience" },
  { value: "7", label: "Books published" },
  { value: "32", label: "Webinars" },
];

const About = ({ content }: { content?: SectionContent }) => {
  const greeting = pickString(content, "greeting", "Hello,");
  const nameHeading = pickString(content, "name_heading", "I'm Nery.");
  const intro = pickString(
    content,
    "intro",
    "I've spent 30+ years in teaching, research, and curriculum development, and my mission is to help educators apply practical, research-backed approaches that improve literacy, strengthen ESL instruction, and support better learning outcomes.",
  );
  const image = pickString(content, "image_url", MariaPhoto);
  const stats = pickList<Stat>(content, "stats", DEFAULT_STATS);

  return (
    <section className="text-center mt-30">
      <header className="mb-11">
        <p className="headline-gradient text-lg font-text uppercase tracking-[0.05em] mb-4 font-bold">
          {greeting}
        </p>
        <h2 className="font-heading uppercase text-5xl">{nameHeading}</h2>
      </header>
      <div>
        <p className="text-2xl max-w-[75ch] mx-auto mb-9">{intro}</p>
      </div>
      <div className="img max-w-[725px] grid place-items-center mx-auto my-10 px-3 w-full">
        <img
          src={image}
          alt="Maria Cequena"
          className="h-fulls max-h-[366px] rounded-2xl"
        />
      </div>
      <div className="stats mx-auto grid w-full max-w-[1100px] grid-cols-1 gap-4 px-3 sm:grid-cols-2 sm:px-4 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const accent = STAT_ACCENTS[index % STAT_ACCENTS.length];
          return (
            <div
              key={`${stat.value}-${index}`}
              className={`relative border border-black/15 p-6 dark:border-white/15 sm:p-8
  before:absolute before:left-1/2 before:top-0 before:block
  before:h-px before:w-3/4 before:-translate-x-1/2
  before:bg-gradient-to-r before:from-transparent
  ${accent.via} before:to-transparent before:content-['']`}
            >
              <p
                className={`mb-3 text-3xl leading-tight tracking-[0.05em] ${accent.text} font-bold sm:text-4xl`}
              >
                {stat.value}
              </p>
              <p className="text-base sm:text-[18px]">{stat.label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default About;
