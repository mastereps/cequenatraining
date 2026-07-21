import { useEffect, useState, type ComponentType } from "react";
import Hero from "../../landing-page/components/Hero";
import About from "../../landing-page/components/About";
import WhatWeDo from "../../landing-page/components/WhatWeDo";
import FeaturedBooksSection from "../../landing-page/components/FeaturedBooksSection";
import LatestEvents from "../../landing-page/components/LatestEvents";
import Credibility from "../../landing-page/components/Credibility";
import WhoWeAre from "../../components/WhoWeAre";
import Reveal from "../../components/Reveal";
import AboutHero from "../../pages/about/AboutHero";
import AboutBody from "../../pages/about/AboutBody";
import AboutStats from "../../pages/about/AboutStats";
import AboutGallery from "../../pages/about/AboutGallery";
import AboutApproach from "../../pages/about/AboutApproach";
import { fetchPageContent } from "./api";
import type { ContentPage, PageSection, SectionContent } from "./types";

type SectionComponent = ComponentType<{ content?: SectionContent }>;

interface RegistryEntry {
  Component: SectionComponent;
  // When true the section is wrapped in the shared max-width container
  // (used for the About page body group); full-bleed sections manage their own.
  contained?: boolean;
}

const REGISTRY: Record<ContentPage, Record<string, RegistryEntry>> = {
  home: {
    hero: { Component: Hero },
    about_intro: { Component: About },
    what_we_do: { Component: WhatWeDo },
    featured_books: { Component: FeaturedBooksSection },
    latest_events: { Component: LatestEvents },
    credibility: { Component: Credibility },
  },
  about: {
    about_hero: { Component: AboutHero },
    who_we_are: { Component: WhoWeAre },
    about_body: { Component: AboutBody, contained: true },
    about_stats: { Component: AboutStats, contained: true },
    about_gallery: { Component: AboutGallery, contained: true },
    about_approach: { Component: AboutApproach, contained: true },
  },
};

// Default order used before the API responds or if it fails, so the page
// always renders (each component falls back to its hardcoded content).
const DEFAULT_ORDER: Record<ContentPage, string[]> = {
  home: ["hero", "about_intro", "what_we_do", "featured_books", "latest_events", "credibility"],
  about: ["about_hero", "who_we_are", "about_body", "about_stats", "about_gallery", "about_approach"],
};

// Heroes render above the fold, so a scroll reveal there just fires on load
// and reads as the page jumping. They stay static.
const NO_REVEAL = new Set(["hero", "about_hero"]);

const buildDefaultSections = (page: ContentPage): PageSection[] =>
  DEFAULT_ORDER[page].map((section_key, index) => ({
    id: `default-${section_key}`,
    page,
    section_key,
    label: section_key,
    sort_order: index,
    is_visible: true,
    content: {},
  }));

/**
 * Fetches the ordered, visible sections for a page and renders them via the
 * registry. Falls back to the default static order on load/error.
 */
export const PageSections = ({ page }: { page: ContentPage }) => {
  const [sections, setSections] = useState<PageSection[]>(() => buildDefaultSections(page));

  useEffect(() => {
    let active = true;
    setSections(buildDefaultSections(page));
    void (async () => {
      try {
        const data = await fetchPageContent(page);
        if (active && data.length > 0) {
          setSections(data);
        }
      } catch {
        // Keep the default sections already in state.
      }
    })();
    return () => {
      active = false;
    };
  }, [page]);

  return (
    <>
      {sections.map((section) => {
        const entry = REGISTRY[page][section.section_key];
        if (!entry) return null;
        const { Component, contained } = entry;
        const rendered = <Component content={section.content} />;
        if (NO_REVEAL.has(section.section_key)) {
          return <div key={section.id}>{rendered}</div>;
        }
        if (contained) {
          return (
            <Reveal
              key={section.id}
              className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8"
            >
              {rendered}
            </Reveal>
          );
        }
        return <Reveal key={section.id}>{rendered}</Reveal>;
      })}
    </>
  );
};
