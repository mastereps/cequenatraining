export const getRegistrationSubmittedStorageKey = (slug: string) =>
  `webinar-registration-submitted:${slug}`;

export const getRegistrationStatusStorageKey = (slug: string) =>
  `webinar-registration-status:${slug}`;

export const getSubmittedEmailForWebinar = (slug: string) => {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(getRegistrationSubmittedStorageKey(slug));
};

export const setSubmittedEmailForWebinar = (slug: string, email: string) => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(getRegistrationSubmittedStorageKey(slug), email);
};

export const getSubmittedStatusForWebinar = (slug: string) => {
  if (typeof window === "undefined") return null;
  const value = sessionStorage.getItem(getRegistrationStatusStorageKey(slug));
  if (value === "pending" || value === "verified") return value;
  return null;
};

export const setSubmittedStatusForWebinar = (
  slug: string,
  status: "pending" | "verified",
) => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(getRegistrationStatusStorageKey(slug), status);
};

export const clearSubmittedEmailForWebinar = (slug: string) => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(getRegistrationSubmittedStorageKey(slug));
  sessionStorage.removeItem(getRegistrationStatusStorageKey(slug));
};

export const hasSubmittedWebinarRegistration = (slug: string) =>
  Boolean(getSubmittedEmailForWebinar(slug));
