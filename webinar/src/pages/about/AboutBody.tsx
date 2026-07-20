import ProfilePhoto from "../../assets/images/003_international1.png";
import type { SectionContent } from "../../features/content/types";
import { pickList, pickString } from "../../features/content/helpers";

const DEFAULT_PARAGRAPHS = [
  "Maria B. Cequena has spent more than three decades helping teachers turn research into classroom practice. Her work sits at the intersection of literacy, ESL, curriculum development, and instructional coaching built for real learners and real school settings.",
  "Through practical webinars, author talks, and educator training, she equips teachers with strategies they can use immediately. Her sessions are known for being direct, structured, and deeply connected to the everyday demands of teaching diverse learners.",
  "Maria's books and professional learning programs reflect a consistent focus on clarity, reflection, and classroom impact. She helps educators strengthen reading instruction, support language development, and build confidence in the decisions they make for students.",
  "The result is a body of work shaped by partnership, mentorship, and a shared commitment to better learning. Maria continues to champion practical professional development that respects teachers' time while raising the quality of instruction.",
];

const AboutBody = ({ content }: { content?: SectionContent }) => {
  const eyebrow = pickString(content, "eyebrow", "About Maria");
  const name = pickString(content, "name", "Maria B. Cequena");
  const paragraphs = pickList<string>(content, "paragraphs", DEFAULT_PARAGRAPHS);
  const portrait = pickString(content, "portrait_url", ProfilePhoto);
  const portraitRole = pickString(content, "portrait_role", "Educator / Author / Speaker");
  const portraitCaption = pickString(
    content,
    "portrait_caption",
    "Practical learning experiences for teachers who want research to show up clearly in the classroom.",
  );

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.85fr)] lg:gap-14">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.28em] text-slate-500 dark:text-white/55">
          {eyebrow}
        </p>

        <div className="mt-6 inline-block bg-lantern px-5 py-4 sm:px-8 sm:py-5">
          <h2 className="font-heading text-4xl uppercase leading-[0.95] text-black sm:text-6xl">
            {name}
          </h2>
        </div>

        <div className="mt-10 space-y-8 text-lg leading-relaxed text-slate-700 sm:text-[1.4rem] dark:text-white/82">
          {paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
        <img
          src={portrait}
          alt="Maria B. Cequena portrait"
          className="h-full min-h-[520px] w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
          <p className="font-text text-xs uppercase tracking-[0.35em] text-lantern">
            {portraitRole}
          </p>
          <p className="mt-3 max-w-md text-base leading-relaxed text-white/80 dark:text-white/80">
            {portraitCaption}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutBody;
