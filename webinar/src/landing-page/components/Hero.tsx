// import HeroBanner from "../../assets/images/hero-webinar.jpg";

// const Hero = () => {
//   return (
//     <section
//       id="hero"
//       className="relative before:content-[''] before:absolute before:inset-0 before:bg-black/75 before:z-20 before:pointer-events-none after:content-['']
//     after:absolute
//     after:inset-0
//     after:bg-[linear-gradient(to_bottom,_rgba(0,0,0,0.65)_0%,_rgba(0,0,0,0)_52%,_rgba(0,0,0,0)_100%)]
//     after:z-20
//     after:pointer-events-none h-screen"
//     >
//       <img
//         src={HeroBanner}
//         alt="Banner"
//         className="h-full w-screen object-cover pointer-events-none"
//       />

//       <div
//         id="webinarHero"
//         className="text-center text-white hero-content z-30 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform"
//       >
//         <h2 className="mb-[26px] font-heading text-5xl tracking-wide  uppercase">
//           Practical Webinars
//         </h2>
//         <p className="tracking-[0.03em] sub-head font-text uppercase">
//           Workshops on research writing and innovative teaching
//         </p>
//         <button className="uppercase transition-all duration-320 font-text mt-8 px-8 py-2.5 font-bold bg-lantern tracking-[0.09em] text-white cursor-pointer hover:bg-white hover:text-black hover:shadow-[0_0_0_.2rem_#fff]">
//           Save My Seat
//         </button>
//       </div>
//       <div
//         id="bookHero"
//         className="text-center text-white hero-content z-30 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform"
//       >
//         <h2 className="mb-[26px] font-heading text-5xl tracking-wide  uppercase">
//           Beyond the Page
//         </h2>
//         <p className="tracking-[0.03em] sub-head font-text uppercase">
//           Poems and books for more engaging teaching
//         </p>
//         <button className="uppercase transition-all duration-320 font-text mt-8 px-8 py-2.5 font-bold bg-lantern tracking-[0.09em] text-white cursor-pointer hover:bg-white hover:text-black hover:shadow-[0_0_0_.2rem_#fff]">
//           Order Now
//         </button>
//       </div>
//     </section>
//   );
// };

// export default Hero;

import { useEffect, useState } from "react";
import HeroOne from "../../assets/images/hero-webinar.jpg";
import HeroTwo from "../../assets/images/books.jpg";

const slides = [
  {
    title: "Practical Webinars",
    subtitle: "Workshops on research writing and innovative teaching",
    cta: "Save My Seat",
    href: "#",
    image: HeroOne,
  },
  {
    title: "Beyond the Page",
    subtitle: "Poems and books for more engaging teaching",
    cta: "Order Now",
    href: "#",
    image: HeroTwo,
  },
];

const Hero = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const t = setTimeout(
      () => setCurrent((i) => (i + 1) % slides.length),
      11500,
    );
    return () => clearTimeout(t);
  }, [current]);

  return (
    <section className="relative h-screen min-h-[520px] overflow-hidden text-white">
      <div className="absolute inset-0">
        {slides.map((s, i) => (
          <div
            key={s.title}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ${
              current === i ? "opacity-100" : "opacity-0"
            }`}
            style={{ backgroundImage: `url(${s.image})` }}
            aria-hidden
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-black/70" aria-hidden />
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black/50"
        aria-hidden
      />

      <div className="relative z-10 h-full">
        {slides.map((s, i) => (
          <div
            key={s.title}
            className={`absolute inset-0 flex items-center justify-center px-6 ${
              current === i
                ? "opacity-100 translate-y-0 pointer-events-auto transition-all duration-1000"
                : "opacity-0 translate-y-6 pointer-events-none transition-none"
            }`}
            aria-hidden={current !== i}
          >
            <div className="text-center space-y-5">
              <h2 className="text-5xl font-heading uppercase tracking-wide">
                {s.title}
              </h2>
              <p className="text-lg font-text uppercase tracking-[0.05em]">
                {s.subtitle}
              </p>
              <a
                href={s.href}
                className="inline-block mt-4 px-8 py-3 font-text font-bold uppercase tracking-[0.08em] bg-lantern text-white transition-all duration-300 hover:bg-white hover:text-black hover:shadow-[0_0_0_.2rem_#fff]"
              >
                {s.cta}
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute inset-x-0 bottom-10 z-20 flex items-center justify-center gap-3">
        {slides.map((_, i) => {
          const active = i === current;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              className={`h-3 w-3 rounded-full border-2 transition-all duration-200 cursor-pointer ${
                active
                  ? "border-white bg-white"
                  : "border-white/60 bg-white/40 hover:bg-white/70 hover:border-white/80"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          );
        })}
      </div>
    </section>
  );
};

export default Hero;
