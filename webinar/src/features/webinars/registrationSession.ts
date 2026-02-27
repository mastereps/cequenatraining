export const getRegistrationSubmittedStorageKey = (slug: string) =>
  `webinar-registration-submitted:${slug}`;

export const getRegistrationStatusStorageKey = (slug: string) =>
  `webinar-registration-status:${slug}`;

export const getRegistrationPaymentRequiredStorageKey = (slug: string) =>
  `webinar-registration-payment-required:${slug}`;

export const getRegistrationPaymentStatusStorageKey = (slug: string) =>
  `webinar-registration-payment-status:${slug}`;

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

export const getSubmittedPaymentMetaForWebinar = (slug: string) => {
  if (typeof window === "undefined") {
    return { paymentRequired: null as boolean | null, paymentStatus: null as string | null };
  }

  const paymentRequiredRaw = sessionStorage.getItem(getRegistrationPaymentRequiredStorageKey(slug));
  const paymentStatusRaw = sessionStorage.getItem(getRegistrationPaymentStatusStorageKey(slug));

  const paymentRequired =
    paymentRequiredRaw === "true" ? true : paymentRequiredRaw === "false" ? false : null;
  const paymentStatus = paymentStatusRaw || null;

  return { paymentRequired, paymentStatus };
};

export const setSubmittedPaymentMetaForWebinar = (
  slug: string,
  paymentRequired: boolean | null | undefined,
  paymentStatus: string | null | undefined,
) => {
  if (typeof window === "undefined") return;

  if (paymentRequired === true || paymentRequired === false) {
    sessionStorage.setItem(getRegistrationPaymentRequiredStorageKey(slug), String(paymentRequired));
  } else {
    sessionStorage.removeItem(getRegistrationPaymentRequiredStorageKey(slug));
  }

  if (paymentStatus) {
    sessionStorage.setItem(getRegistrationPaymentStatusStorageKey(slug), paymentStatus);
  } else {
    sessionStorage.removeItem(getRegistrationPaymentStatusStorageKey(slug));
  }
};

export const clearSubmittedEmailForWebinar = (slug: string) => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(getRegistrationSubmittedStorageKey(slug));
  sessionStorage.removeItem(getRegistrationStatusStorageKey(slug));
  sessionStorage.removeItem(getRegistrationPaymentRequiredStorageKey(slug));
  sessionStorage.removeItem(getRegistrationPaymentStatusStorageKey(slug));
};

export const hasSubmittedWebinarRegistration = (slug: string) =>
  Boolean(getSubmittedEmailForWebinar(slug));
