import type {
  ContentPage,
  PageContentResponse,
  PageSection,
  SectionContent,
  SectionOrderEntry,
  UploadImageResponse,
} from "./types";

const getErrorMessage = async (res: Response) => {
  try {
    const payload = (await res.json()) as { error?: string };
    return payload.error || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
};

/** Public: ordered, visible sections used to render a marketing page. */
export const fetchPageContent = async (page: ContentPage): Promise<PageSection[]> => {
  const res = await fetch(`/api/content/${page}`, { credentials: "include" });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }
  const payload = (await res.json()) as PageContentResponse;
  return payload.sections;
};

/** Admin: every section for a page, including hidden ones. */
export const fetchAdminPageContent = async (page: ContentPage): Promise<PageSection[]> => {
  const res = await fetch(`/api/admin/content/${page}`, { credentials: "include" });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }
  const payload = (await res.json()) as PageContentResponse;
  return payload.sections;
};

/** Admin: persist a new ordering for a page. */
export const updateSectionOrder = async (
  page: ContentPage,
  order: SectionOrderEntry[],
): Promise<PageSection[]> => {
  const res = await fetch(`/api/admin/content/${page}/order`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(order),
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }
  const payload = (await res.json()) as PageContentResponse;
  return payload.sections;
};

/** Admin: update a single section's content and/or visibility. */
export const updateSection = async (
  page: ContentPage,
  sectionKey: string,
  updates: { content?: SectionContent; is_visible?: boolean },
): Promise<PageSection> => {
  const res = await fetch(`/api/admin/content/${page}/${sectionKey}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }
  const payload = (await res.json()) as { section: PageSection };
  return payload.section;
};

/** Admin: upload an image file, returns its served URL. */
export const uploadContentImage = async (file: File): Promise<string> => {
  const body = new FormData();
  body.append("image", file);
  const res = await fetch(`/api/admin/uploads`, {
    method: "POST",
    credentials: "include",
    body,
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }
  const payload = (await res.json()) as UploadImageResponse;
  return payload.url;
};
