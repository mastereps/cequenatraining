BEGIN;

-- "Testimonials" section on the home page, between Latest Events and
-- Credibility. Values mirror the component's hardcoded defaults so the rendered
-- page is identical whether or not this row is present.
INSERT INTO public.page_sections (page, section_key, label, sort_order, content) VALUES
  ('home', 'testimonials', 'Testimonials', 55, $j${
    "heading": "Testimonials",
    "testimonials": [
      {
        "quote": "The webinars are informative, well-organized, and easy to follow. I always leave each session with practical insights I can apply in teaching and research.",
        "name": "Angela Marie"
      },
      {
        "quote": "I love how the platform combines learning and resources in one place. After attending a webinar, I was also able to purchase books that helped me deepen my understanding of the topic.",
        "name": "Mark Anthony"
      },
      {
        "quote": "The speakers are knowledgeable, and the discussions are engaging. The recommended books are also worth buying because they are relevant, credible, and useful for professional growth.",
        "name": "Sofia Elaine"
      },
      {
        "quote": "This platform is a great space for continuous learning. The webinars are enriching, and the book collection offers valuable materials for educators, researchers, and lifelong learners.",
        "name": "Daniel Joshua"
      }
    ]
  }$j$::jsonb)
ON CONFLICT (page, section_key) DO NOTHING;

COMMIT;
