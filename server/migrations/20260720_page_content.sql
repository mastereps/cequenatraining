BEGIN;

-- Editable/reorderable content sections for marketing pages (home, about).
-- Each row is one section on a page. `content` holds the curated, editable
-- fields for that section (text, image URLs, small lists). Ordering and
-- visibility are driven by `sort_order` and `is_visible`.
CREATE TABLE IF NOT EXISTS public.page_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL,
  section_key text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT page_sections_page_valid CHECK (page IN ('home', 'about')),
  CONSTRAINT page_sections_page_key_unique UNIQUE (page, section_key)
);

CREATE INDEX IF NOT EXISTS page_sections_page_order_idx
  ON public.page_sections (page, sort_order);

DROP TRIGGER IF EXISTS page_sections_set_updated_at ON public.page_sections;
CREATE TRIGGER page_sections_set_updated_at
BEFORE UPDATE ON public.page_sections
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

-- ---------------------------------------------------------------------------
-- Seed rows. Values mirror the current hardcoded components so the live site
-- is unchanged after applying this migration. Image fields left empty ("")
-- fall back to the bundled asset imports in the React components.
-- ON CONFLICT DO NOTHING keeps this migration safe to re-run.
-- ---------------------------------------------------------------------------

-- Home page
INSERT INTO public.page_sections (page, section_key, label, sort_order, content) VALUES
  ('home', 'hero', 'Hero', 10, '{}'::jsonb),
  ('home', 'about_intro', 'About Intro', 20, $j${
    "greeting": "Hello,",
    "name_heading": "I'm Nery.",
    "intro": "I've spent 30+ years in teaching, research, and curriculum development, and my mission is to help educators apply practical, research-backed approaches that improve literacy, strengthen ESL instruction, and support better learning outcomes.",
    "image_url": "",
    "stats": [
      { "value": "1000+", "label": "Teachers trained" },
      { "value": "30+", "label": "Years of teaching experience" },
      { "value": "7", "label": "Books published" },
      { "value": "32", "label": "Webinars" }
    ]
  }$j$::jsonb),
  ('home', 'what_we_do', 'What We Do', 30, $j${
    "heading": "What We Do",
    "cards": [
      { "title": "Webinars", "image_url": "" },
      { "title": "Teacher Training", "image_url": "" },
      { "title": "Author Talks", "image_url": "" },
      { "title": "Consultancy", "image_url": "" }
    ]
  }$j$::jsonb),
  ('home', 'featured_books', 'Featured Books', 40, '{}'::jsonb),
  ('home', 'latest_events', 'Latest Events', 50, '{}'::jsonb),
  ('home', 'credibility', 'Credibility', 60, '{}'::jsonb)
ON CONFLICT (page, section_key) DO NOTHING;

-- About page
INSERT INTO public.page_sections (page, section_key, label, sort_order, content) VALUES
  ('about', 'about_hero', 'About Hero', 10, $j${
    "breadcrumb_label": "About",
    "title": "Practical Webinars",
    "subtitle": "Empowering teachers with practical and research-based learning"
  }$j$::jsonb),
  ('about', 'who_we_are', 'Who We Are', 20, $j${
    "heading": "Who We Are",
    "subheading": "A Brief Story About Maria Cequeña",
    "milestones": [
      { "no": "01", "title": "Cum Laude", "detail": "BSE English, Pasig Catholic College" },
      { "no": "02", "title": "MA Literature", "detail": "Ateneo de Manila University" },
      { "no": "03", "title": "PhD (Reading Education)", "detail": "UP Diliman University" },
      { "no": "04", "title": "Educator", "detail": "English & research at De La Salle, UST, National University" },
      { "no": "05", "title": "Published Researcher", "detail": "ESL writing & reading comprehension; Scopus journal reviewer" },
      { "no": "06", "title": "Academic Dept. Head", "detail": "Catholic Filipino Academy Homeschool" },
      { "no": "07", "title": "Established", "detail": "Founder & President, Cequeña Training and Consultancy OPC", "highlight": true },
      { "no": "08", "title": "Educator-Author Today", "detail": "7 books · 1,000+ teachers trained · 32 webinars" }
    ]
  }$j$::jsonb),
  ('about', 'about_body', 'About Body', 30, $j${
    "eyebrow": "About Maria",
    "name": "Maria B. Cequena",
    "paragraphs": [
      "Maria B. Cequena has spent more than three decades helping teachers turn research into classroom practice. Her work sits at the intersection of literacy, ESL, curriculum development, and instructional coaching built for real learners and real school settings.",
      "Through practical webinars, author talks, and educator training, she equips teachers with strategies they can use immediately. Her sessions are known for being direct, structured, and deeply connected to the everyday demands of teaching diverse learners.",
      "Maria's books and professional learning programs reflect a consistent focus on clarity, reflection, and classroom impact. She helps educators strengthen reading instruction, support language development, and build confidence in the decisions they make for students.",
      "The result is a body of work shaped by partnership, mentorship, and a shared commitment to better learning. Maria continues to champion practical professional development that respects teachers' time while raising the quality of instruction."
    ],
    "portrait_url": "",
    "portrait_role": "Educator / Author / Speaker",
    "portrait_caption": "Practical learning experiences for teachers who want research to show up clearly in the classroom."
  }$j$::jsonb),
  ('about', 'about_stats', 'About Stats', 40, $j${
    "cards": [
      { "value": "30+", "label": "Years in education", "text": "Teaching, research, curriculum development, and professional learning shaped by classroom realities." },
      { "value": "Literacy", "label": "Core focus areas", "text": "Reading instruction, ESL support, and reflective strategies that help teachers meet learners where they are." },
      { "value": "Books + Webinars", "label": "Practical professional learning", "text": "Resources designed to make ideas usable, sustainable, and worth bringing back into the next school day." }
    ]
  }$j$::jsonb),
  ('about', 'about_gallery', 'About Gallery', 50, $j${
    "images": ["", "", ""]
  }$j$::jsonb),
  ('about', 'about_approach', 'About Approach', 60, $j${
    "image_url": "",
    "eyebrow": "Her Approach",
    "heading": "Research-backed ideas, translated into teaching moves that feel usable right away.",
    "paragraph": "Maria builds learning experiences that respect the pace of teachers while still pushing toward better instruction. Her work is rooted in reflection, collaboration, and the belief that strong professional development should leave educators with clarity, not overload.",
    "cards": [
      { "label": "What educators gain", "text": "Clear frameworks, practical strategies, and actionable next steps for literacy and language instruction." },
      { "label": "What drives the work", "text": "Partnership, mentorship, and better outcomes for students through better-supported teachers." }
    ]
  }$j$::jsonb)
ON CONFLICT (page, section_key) DO NOTHING;

COMMIT;
