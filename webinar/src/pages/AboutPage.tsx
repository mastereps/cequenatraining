import { Link } from "react-router-dom";
import HeroBanner from "../assets/images/hero-webinar.jpg";
import InternationalPhoto from "../assets/images/001_international.png";
import GroupPhoto from "../assets/images/002_group.png";
import InternationalEventPhoto from "../assets/images/006_ggroup.png";
import ProfilePhoto from "../assets/images/003_international1.png";
import ZoomPhoto from "../assets/images/005_zoom.png";

const AboutPage = () => {
  return (
    <section className="mt-24 bg-slate-50 pb-20 text-slate-900 dark:bg-black dark:text-white">
      <div className="relative h-[350px] w-full overflow-hidden border-b border-slate-200 dark:border-white/10 sm:h-[40vh] sm:min-h-[320px] sm:max-h-[420px]">
        <img
          src={HeroBanner}
          alt="Practical webinars hero"
          className="h-full w-full object-cover object-bottom"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/65 via-slate-950/40 to-slate-950/55 dark:from-black/60 dark:via-black/40 dark:to-black/55" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(227,179,35,0.24),transparent_45%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(227,179,35,0.2),transparent_45%)]" />
        <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[1240px] px-4 pb-8 text-white">
          <p className="mb-3 text-sm">
            <Link to="/" className="text-white/70 transition hover:text-white">
              Home
            </Link>{" "}
            / <span className="text-white">About</span>
          </p>
          <h1 className="font-heading text-4xl uppercase sm:text-6xl">
            Practical Webinars
          </h1>
          <p className="mt-4 font-text text-sm uppercase tracking-[0.08em] sm:text-base">
            Empowering teachers with practical and research-based learning
          </p>
        </div>
      </div>

      <div className="bg-slate-50 text-slate-900 dark:bg-black dark:text-white">
        <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.85fr)] lg:gap-14">
            <div className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.28em] text-slate-500 dark:text-white/55">
                About Maria
              </p>

              <div className="mt-6 inline-block bg-lantern px-5 py-4 sm:px-8 sm:py-5">
                <h2 className="font-heading text-4xl uppercase leading-[0.95] text-black sm:text-6xl">
                  Maria B. Cequena
                </h2>
              </div>

              <div className="mt-10 space-y-8 text-lg leading-relaxed text-slate-700 sm:text-[1.4rem] dark:text-white/82">
                <p>
                  Maria B. Cequena has spent more than three decades helping
                  teachers turn research into classroom practice. Her work sits
                  at the intersection of literacy, ESL, curriculum development,
                  and instructional coaching built for real learners and real
                  school settings.
                </p>
                <p>
                  Through practical webinars, author talks, and educator
                  training, she equips teachers with strategies they can use
                  immediately. Her sessions are known for being direct,
                  structured, and deeply connected to the everyday demands of
                  teaching diverse learners.
                </p>
                <p>
                  Maria&apos;s books and professional learning programs reflect
                  a consistent focus on clarity, reflection, and classroom
                  impact. She helps educators strengthen reading instruction,
                  support language development, and build confidence in the
                  decisions they make for students.
                </p>
                <p>
                  The result is a body of work shaped by partnership,
                  mentorship, and a shared commitment to better learning. Maria
                  continues to champion practical professional development that
                  respects teachers&apos; time while raising the quality of
                  instruction.
                </p>
              </div>
            </div>

            <div className="relative overflow-hidden border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
              <img
                src={ProfilePhoto}
                alt="Maria B. Cequena portrait"
                className="h-full min-h-[520px] w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                <p className="font-text text-xs uppercase tracking-[0.35em] text-lantern">
                  Educator / Author / Speaker
                </p>
                <p className="mt-3 max-w-md text-base leading-relaxed text-white/80 dark:text-white/80">
                  Practical learning experiences for teachers who want research
                  to show up clearly in the classroom.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-3">
            <div className="border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none">
              <p className="font-heading text-4xl uppercase text-lantern">
                30+
              </p>
              <p className="mt-3 text-sm uppercase tracking-[0.18em] text-slate-500 dark:text-white/55">
                Years in education
              </p>
              <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-white/72">
                Teaching, research, curriculum development, and professional
                learning shaped by classroom realities.
              </p>
            </div>
            <div className="border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none">
              <p className="font-heading text-4xl uppercase text-lantern">
                Literacy
              </p>
              <p className="mt-3 text-sm uppercase tracking-[0.18em] text-slate-500 dark:text-white/55">
                Core focus areas
              </p>
              <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-white/72">
                Reading instruction, ESL support, and reflective strategies that
                help teachers meet learners where they are.
              </p>
            </div>
            <div className="border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none">
              <p className="font-heading text-4xl uppercase text-lantern">
                Books + Webinars
              </p>
              <p className="mt-3 text-sm uppercase tracking-[0.18em] text-slate-500 dark:text-white/55">
                Practical professional learning
              </p>
              <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-white/72">
                Resources designed to make ideas usable, sustainable, and worth
                bringing back into the next school day.
              </p>
            </div>
          </div>

          <div className="mt-20 grid gap-5 md:grid-cols-3">
            <div className="overflow-hidden border border-slate-200 shadow-sm dark:border-white/10 dark:shadow-none">
              <img
                src={GroupPhoto}
                alt="Maria Cequena with fellow educators"
                className="h-[220px] w-full object-cover"
              />
            </div>
            <div className="overflow-hidden border border-slate-200 shadow-sm dark:border-white/10 dark:shadow-none">
              <img
                src={InternationalPhoto}
                alt="Maria Cequena at an international event"
                className="h-[220px]   object-[60%_20%] w-full object-cover"
              />
            </div>
            <div className="overflow-hidden border border-slate-200 shadow-sm dark:border-white/10 dark:shadow-none">
              <img
                src={InternationalEventPhoto}
                alt="Maria Cequena during a professional engagement"
                className="h-[220px]  object-[50%_50%] w-full object-cover"
              />
            </div>
          </div>

          <div className="mt-20 grid gap-10 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1fr)] lg:items-center">
            <div className="overflow-hidden border border-slate-200 shadow-sm dark:border-white/10 dark:shadow-none">
              <img
                src={ZoomPhoto}
                alt="Maria Cequena leading an online session"
                className="h-full min-h-[320px] w-full object-cover"
              />
            </div>

            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-slate-500 dark:text-white/55">
                Her Approach
              </p>
              <h3 className="mt-5 max-w-2xl font-heading text-3xl uppercase leading-tight text-slate-900 dark:text-white sm:text-5xl">
                Research-backed ideas, translated into teaching moves that feel
                usable right away.
              </h3>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-white/78">
                Maria builds learning experiences that respect the pace of
                teachers while still pushing toward better instruction. Her work
                is rooted in reflection, collaboration, and the belief that
                strong professional development should leave educators with
                clarity, not overload.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-transparent dark:shadow-none">
                  <p className="font-text text-xs uppercase tracking-[0.22em] text-lantern">
                    What educators gain
                  </p>
                  <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-white/75">
                    Clear frameworks, practical strategies, and actionable next
                    steps for literacy and language instruction.
                  </p>
                </div>
                <div className="border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-transparent dark:shadow-none">
                  <p className="font-text text-xs uppercase tracking-[0.22em] text-lantern">
                    What drives the work
                  </p>
                  <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-white/75">
                    Partnership, mentorship, and better outcomes for students
                    through better-supported teachers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutPage;
