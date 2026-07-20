import { PageSections } from "../features/content/sectionRegistry";

const AboutPage = () => {
  return (
    <section className="mt-24 bg-slate-50 pb-20 text-slate-900 dark:bg-black dark:text-white">
      <PageSections page="about" />
    </section>
  );
};

export default AboutPage;
