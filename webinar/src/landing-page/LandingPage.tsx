import About from "./components/About";
import Credibility from "./components/Credibility";
import FeaturedBooksSection from "./components/FeaturedBooksSection";
import Hero from "./components/Hero";
import LatestEvents from "./components/LatestEvents";

const LandingPage = () => {
  return (
    <>
      <Hero />
      <About />
      <FeaturedBooksSection />
      <LatestEvents />
      <Credibility />
    </>
  );
};

export default LandingPage;
