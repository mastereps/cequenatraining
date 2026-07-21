// Declarative description of which fields are editable per section, and how
// the admin UI should render inputs for them. Rendering markup stays in the
// section components; this only covers the curated, editable field set.

export type LeafType = "text" | "textarea" | "image" | "boolean";

export interface LeafField {
  key: string;
  label: string;
  type: LeafType;
}

export type ContentField =
  | { key: string; label: string; type: LeafType }
  // Array of primitive strings (e.g. gallery image URLs, paragraphs).
  | { key: string; label: string; type: "stringList"; itemType: "text" | "textarea" | "image"; itemLabel?: string }
  // Array of objects with their own leaf fields (e.g. cards, stats, milestones).
  | { key: string; label: string; type: "objectList"; itemLabel?: string; fields: LeafField[] };

// section_key -> editable fields. Sections omitted here (hero, featured_books,
// latest_events, credibility) are reorder/visibility-only.
export const SECTION_FIELD_SCHEMAS: Record<string, ContentField[]> = {
  about_intro: [
    { key: "greeting", label: "Greeting", type: "text" },
    { key: "name_heading", label: "Name heading", type: "text" },
    { key: "intro", label: "Intro paragraph", type: "textarea" },
    { key: "image_url", label: "Portrait image", type: "image" },
    {
      key: "stats",
      label: "Stats",
      type: "objectList",
      itemLabel: "Stat",
      fields: [
        { key: "value", label: "Value", type: "text" },
        { key: "label", label: "Label", type: "text" },
      ],
    },
  ],
  what_we_do: [
    { key: "heading", label: "Heading", type: "text" },
    {
      key: "cards",
      label: "Cards",
      type: "objectList",
      itemLabel: "Card",
      fields: [
        { key: "title", label: "Title", type: "text" },
        { key: "image_url", label: "Image", type: "image" },
      ],
    },
  ],
  why_choose_us: [
    { key: "eyebrow", label: "Eyebrow", type: "text" },
    { key: "heading", label: "Heading", type: "text" },
    { key: "subheading", label: "Subheading", type: "textarea" },
    { key: "cta_label", label: "Button label", type: "text" },
    {
      key: "reasons",
      label: "Reasons",
      type: "objectList",
      itemLabel: "Reason",
      fields: [
        { key: "title", label: "Title", type: "text" },
        { key: "text", label: "Text", type: "textarea" },
      ],
    },
  ],
  testimonials: [
    { key: "heading", label: "Heading", type: "text" },
    {
      key: "testimonials",
      label: "Testimonials",
      type: "objectList",
      itemLabel: "Testimonial",
      fields: [
        { key: "quote", label: "Quote", type: "textarea" },
        { key: "name", label: "Name", type: "text" },
      ],
    },
  ],
  about_hero: [
    { key: "breadcrumb_label", label: "Breadcrumb label", type: "text" },
    { key: "title", label: "Title", type: "text" },
    { key: "subtitle", label: "Subtitle", type: "text" },
  ],
  who_we_are: [
    { key: "heading", label: "Heading", type: "text" },
    { key: "subheading", label: "Subheading", type: "text" },
    {
      key: "milestones",
      label: "Milestones",
      type: "objectList",
      itemLabel: "Milestone",
      fields: [
        { key: "no", label: "Number", type: "text" },
        { key: "title", label: "Title", type: "text" },
        { key: "detail", label: "Detail", type: "textarea" },
        { key: "highlight", label: "Highlight", type: "boolean" },
      ],
    },
  ],
  about_body: [
    { key: "eyebrow", label: "Eyebrow", type: "text" },
    { key: "name", label: "Name", type: "text" },
    { key: "paragraphs", label: "Paragraphs", type: "stringList", itemType: "textarea", itemLabel: "Paragraph" },
    { key: "portrait_url", label: "Portrait image", type: "image" },
    { key: "portrait_role", label: "Portrait role", type: "text" },
    { key: "portrait_caption", label: "Portrait caption", type: "textarea" },
  ],
  about_stats: [
    {
      key: "cards",
      label: "Cards",
      type: "objectList",
      itemLabel: "Card",
      fields: [
        { key: "value", label: "Value", type: "text" },
        { key: "label", label: "Label", type: "text" },
        { key: "text", label: "Text", type: "textarea" },
      ],
    },
  ],
  about_gallery: [
    { key: "images", label: "Gallery images", type: "stringList", itemType: "image", itemLabel: "Image" },
  ],
  about_approach: [
    { key: "image_url", label: "Image", type: "image" },
    { key: "eyebrow", label: "Eyebrow", type: "text" },
    { key: "heading", label: "Heading", type: "textarea" },
    { key: "paragraph", label: "Paragraph", type: "textarea" },
    {
      key: "cards",
      label: "Cards",
      type: "objectList",
      itemLabel: "Card",
      fields: [
        { key: "label", label: "Label", type: "text" },
        { key: "text", label: "Text", type: "textarea" },
      ],
    },
  ],
};

export const getSectionFields = (sectionKey: string): ContentField[] =>
  SECTION_FIELD_SCHEMAS[sectionKey] ?? [];
