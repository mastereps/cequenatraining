import MariaLike from "../assets/images/MariaLike.jpg";
import MariaK from "../assets/images/MariaK.jpg";
import MariaGroup from "../assets/images/MariaGroup.jpg";

const AboutPage = () => {
  return (
    <section className="mt-28 px-4 pb-20">
      <div className="mx-auto max-w-[1140px] overflow-hidden rounded-sm border border-white/10 bg-[#141619] text-white">
        <div className="relative h-[320px] w-full overflow-hidden sm:h-[420px]">
          <img
            src={MariaLike}
            alt="Maria Cequena portrait"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/45" />
          <div className="absolute bottom-8 left-8 right-8 text-center sm:left-16 sm:right-16">
            <p className="mb-3 font-text text-xs uppercase tracking-[0.5em] text-slate-300">
              Home - About
            </p>
            <h1 className="font-heading text-4xl uppercase sm:text-6xl">
              Maria B. Cequena
            </h1>
          </div>
        </div>

        <div className="px-6 py-12 sm:px-10 md:px-14">
          <p className="text-center font-heading text-3xl uppercase leading-relaxed text-slate-200 sm:text-4xl">
            Empowering teachers through practical webinars and books that bring
            research into real classrooms.
          </p>

          <div className="mt-12 overflow-hidden rounded-sm border border-white/10">
            <img
              src={MariaGroup}
              alt="Maria Cequena with educators"
              className="h-auto w-full object-cover"
            />
          </div>

          <div className="mt-10 grid gap-8 text-lg leading-relaxed text-slate-200 md:grid-cols-2">
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

          <p className="mt-10 text-center font-heading text-3xl uppercase leading-relaxed text-slate-200 sm:text-4xl">
            We grow together through partnership, mentorship, and a shared
            commitment to better learning.
          </p>

          <div className="mt-12 overflow-hidden rounded-sm border border-white/10">
            <img
              src={MariaK}
              alt="Maria Cequena speaking at an event"
              className="h-[420px] w-full object-cover object-[50%_35%] sm:h-[500px]"
            />
          </div>

          <div className="mt-12">
            <h2 className="font-heading text-4xl uppercase">Core Values</h2>
            <ul className="mt-6 list-disc space-y-3 pl-6 text-lg text-slate-200">
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
