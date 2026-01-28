import MariaPhoto from "../../assets/images/maria_cequena_real.png";

const About = () => {
  return (
    <section className="text-center mt-30">
      <header className="mb-11">
        <p className=" headline-gradient text-lg font-text uppercase tracking-[0.05em] mb-4 font-bold">
          Hello,
        </p>
        <h2 className="font-heading uppercase text-5xl">I'm Nery.</h2>
      </header>
      <div>
        <p className="text-2xl max-w-[75ch] mx-auto mb-9">
          I've spent 30+ years in teaching, research, and curriculum
          development, and my mission is to help educators apply practical,
          research-backed approaches that improve literacy, strengthen ESL
          instruction, and support better learning outcomes.
        </p>
      </div>
      <div className="img max-w-[725px] grid place-items-center mx-auto my-10 px-3 w-full">
        <img
          src={MariaPhoto}
          alt="Maria Cequeña"
          className="h-fulls max-h-[366px] rounded-2xl"
        />
      </div>
      <div className="stats grid grid-cols-4 gap-4 min-[1100px]:max-w-[1100px] mx-auto">
        <div
          className="relative p-8 border dark:border-white/15 border-black/15
  before:absolute before:left-1/2 before:top-0 before:block
  before:h-px before:w-3/4 before:-translate-x-1/2
  before:bg-gradient-to-r before:from-transparent
  before:via-[#9e7cff] before:to-transparent before:content-['']"
        >
          <p className="text-[#9e7cff] font-bold text-4xl leading-tight tracking-[0.05em] mb-3">
            1000+
          </p>
          <p className="text-[18px]">Teachers trained</p>
        </div>
        <div
          className="relative p-8 border dark:border-white/15 border-black/15 before:absolute before:left-1/2 before:top-0 before:block
  before:h-px before:w-3/4 before:-translate-x-1/2
  before:bg-gradient-to-r before:from-transparent
  before:via-lantern before:to-transparent before:content-['']"
        >
          <p className="text-lantern font-bold text-4xl leading-tight tracking-[0.05em] mb-3">
            30+
          </p>
          <p className="text-[18px]">Years of teaching experience</p>
        </div>
        <div
          className="relative p-8 border dark:border-white/15 border-black/15 before:absolute before:left-1/2 before:top-0 before:block
  before:h-px before:w-3/4 before:-translate-x-1/2
  before:bg-gradient-to-r before:from-transparent
  before:via-[rgb(255,95,204)] before:to-transparent before:content-['']"
        >
          <p className="text-[rgb(255,95,204)] font-bold text-4xl leading-tight tracking-[0.05em] mb-3">
            7
          </p>
          <p className="text-[18px]">Books published</p>
        </div>
        <div
          className="relative p-8 border dark:border-white/15 border-black/15 before:absolute before:left-1/2 before:top-0 before:block
  before:h-px before:w-3/4 before:-translate-x-1/2
  before:bg-gradient-to-r before:from-transparent
  before:via-[rgb(255,159,36)] before:to-transparent before:content-['']"
        >
          <p className="text-[rgb(255,159,36)] font-bold text-4xl leading-tight tracking-[0.05em] mb-3">
            32
          </p>
          <p className="text-[18px]">Webinars</p>
        </div>
      </div>
    </section>
  );
};

export default About;
