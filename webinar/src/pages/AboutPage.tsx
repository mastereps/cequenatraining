import { Link } from "react-router-dom";
import MariaLike from "../assets/images/MariaLike.jpg";
import MariaK from "../assets/images/MariaK.jpg";
import MariaGroup from "../assets/images/MariaGroup.jpg";
import HeroBanner from "../assets/images/hero-webinar.jpg";

const AboutPage = () => {
  return (
    <section className="mt-24 bg-slate-100 pb-20 dark:bg-[#090c11]">
      <div className="relative h-[350px] w-full overflow-hidden sm:h-[40vh] sm:min-h-[320px] sm:max-h-[420px]">
        <img
          src={HeroBanner}
          alt="Practical webinars hero"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-white">
          <div>
            <h1 className="font-heading text-4xl uppercase sm:text-6xl">
              Practical Webinars
            </h1>
            <p className="mt-4 font-text text-sm uppercase tracking-[0.08em] sm:text-base">
              Empowering teachers with practical and research-based learning
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-1 max-w-[1140px] py-6 text-left">
        <p className="font-text text-xs uppercase tracking-[0.35em] text-slate-600 dark:text-slate-300">
          <Link to="/" className="hover:text-slate-900 dark:hover:text-white">
            Home
          </Link>{" "}
          <span className="mx-2">&raquo;</span>{" "}
          <span className="text-slate-900 dark:text-white">About</span>
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-[1140px] overflow-hidden rounded-sm border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-[#141619] dark:text-white">
        <div className="relative h-[320px] w-full overflow-hidden sm:h-[420px]">
          <img
            src={MariaLike}
            alt="Maria Cequena portrait"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/45" />
          <div className="absolute bottom-8 left-8 right-8 text-center sm:left-16 sm:right-16">
            <p className="mb-3 font-text text-xs uppercase tracking-[0.5em] text-slate-200">
              Author
            </p>
            <h1 className="font-heading text-4xl uppercase sm:text-6xl">
              Maria B. Cequena
            </h1>
          </div>
        </div>

        <div className="px-6 py-12 sm:px-10 md:px-14">
          <p className="text-center font-heading text-3xl uppercase leading-relaxed text-slate-800 dark:text-slate-200 sm:text-4xl">
            Empowering teachers through practical webinars and books that bring
            research into real classrooms.
          </p>

          <div className="mt-12 overflow-hidden rounded-sm border border-slate-200 dark:border-white/10">
            <img
              src={MariaGroup}
              alt="Maria Cequena with educators"
              className="h-auto w-full object-cover"
            />
          </div>

          <div className="mt-10 grid gap-8 text-lg leading-relaxed text-slate-700 dark:text-slate-200 md:grid-cols-2">
            <p>
              With over 30 years in education, Maria has focused her work on
              literacy, ESL, and curriculum development. Her training style is
              practical, direct, and designed for teachers who need strategies
              they can use immediately.
            </p>
            <p>
              Through webinars and published books, she helps schools and
              educators strengthen classroom practice, improve student outcomes,
              and build confidence in teaching diverse learners.
            </p>
          </div>

          <p className="mt-10 text-center font-heading text-3xl uppercase leading-relaxed text-slate-800 dark:text-slate-200 sm:text-4xl">
            We grow together through partnership, mentorship, and a shared
            commitment to better learning.
          </p>

          <div className="mt-12 overflow-hidden rounded-sm border border-slate-200 dark:border-white/10">
            <img
              src={MariaK}
              alt="Maria Cequena speaking at an event"
              className="h-[420px] w-full object-cover object-[50%_35%] sm:h-[500px]"
            />
          </div>

          <div className="mt-12">
            <h2 className="font-heading text-4xl uppercase">Core Values</h2>
            <ul className="mt-6 list-disc space-y-3 pl-6 text-lg text-slate-700 dark:text-slate-200">
              <li>Excellence in teaching and learning</li>
              <li>Integrity in research and practice</li>
              <li>Practical innovation for modern classrooms</li>
              <li>Supportive collaboration with educators</li>
              <li>Service centered on student success</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutPage;
