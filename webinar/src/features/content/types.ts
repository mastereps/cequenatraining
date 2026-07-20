export type ContentPage = "home" | "about";

// Section content is a free-form record of curated fields. Each section
// component reads the fields it cares about with hardcoded fallbacks.
export type SectionContent = Record<string, unknown>;

export interface PageSection {
  id: string;
  page: ContentPage;
  section_key: string;
  label: string;
  sort_order: number;
  is_visible: boolean;
  content: SectionContent;
}

export interface PageContentResponse {
  page: ContentPage;
  sections: PageSection[];
}

export interface SectionOrderEntry {
  section_key: string;
  sort_order: number;
}

export interface UploadImageResponse {
  url: string;
}
