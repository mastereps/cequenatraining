export const getRegistrationSubmittedStorageKey = (slug: string) =>
  `webinar-registration-submitted:${slug}`;

export const getSubmittedEmailForWebinar = (slug: string) => {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(getRegistrationSubmittedStorageKey(slug));
};

export const setSubmittedEmailForWebinar = (slug: string, email: string) => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(getRegistrationSubmittedStorageKey(slug), email);
};

export const clearSubmittedEmailForWebinar = (slug: string) => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(getRegistrationSubmittedStorageKey(slug));
};

export const hasSubmittedWebinarRegistration = (slug: string) =>
  Boolean(getSubmittedEmailForWebinar(slug));
