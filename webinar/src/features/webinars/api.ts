import type {
  WebinarAdminPaymentProof,
  WebinarAdminPaymentProofListResponse,
  WebinarPaymentProofPayload,
  WebinarPaymentProofResponse,
  WebinarPaymentReviewResponse,
  RegistrationStatusResponse,
  ResendConfirmationResponse,
  WebinarSendZoomLinksResponse,
  VerifyResponse,
  Webinar,
  WebinarListResponse,
  WebinarPaymentSessionPayload,
  WebinarPaymentSessionResponse,
  WebinarRegisterPayload,
  WebinarRegisterResponse,
  WebinarSingleResponse,
} from "./types";

export interface WebinarFilters {
  search?: string;
  from?: string;
  to?: string;
  topic?: string;
  availability?: string;
  /** Defaults to `upcoming` server-side when omitted. */
  when?: "upcoming" | "past" | "all";
  limit?: number;
}

const getErrorMessage = async (res: Response) => {
  try {
    const payload = (await res.json()) as { error?: string };
    return payload.error || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
};

const toQueryString = (filters: WebinarFilters) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }

  const text = params.toString();
  return text ? `?${text}` : "";
};

export const fetchWebinars = async (filters: WebinarFilters = {}): Promise<Webinar[]> => {
  const res = await fetch(`/api/webinars${toQueryString(filters)}`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }

  const payload = (await res.json()) as WebinarListResponse;
  return payload.data;
};

export const fetchWebinarBySlug = async (slug: string): Promise<Webinar> => {
  const res = await fetch(`/api/webinars/${encodeURIComponent(slug)}`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }

  const payload = (await res.json()) as WebinarSingleResponse;
  return payload.data;
};

export const registerWebinar = async (
  slug: string,
  form: WebinarRegisterPayload,
): Promise<WebinarRegisterResponse> => {
  const res = await fetch(`/api/webinars/${encodeURIComponent(slug)}/register`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(form),
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }

  return (await res.json()) as WebinarRegisterResponse;
};

export const verifyWebinarToken = async (token: string): Promise<VerifyResponse> => {
  const res = await fetch(`/api/verify?token=${encodeURIComponent(token)}`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }

  return (await res.json()) as VerifyResponse;
};

export const resendConfirmationEmail = async (
  slug: string,
  email: string,
): Promise<ResendConfirmationResponse> => {
  const idempotencyKey =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const res = await fetch(`/api/webinars/${encodeURIComponent(slug)}/resend-confirmation`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    let payload: { error?: string; details?: { retry_after_seconds?: number } } | null = null;
    try {
      payload = (await res.json()) as { error?: string; details?: { retry_after_seconds?: number } };
    } catch {
      payload = null;
    }

    const message = payload?.error || `HTTP ${res.status}`;
    const retryFromBody = Number(payload?.details?.retry_after_seconds || 0);
    const retryFromHeader = Number(res.headers.get("Retry-After") || 0);
    const retryAfterSeconds = Math.max(retryFromBody, retryFromHeader);
    const error = new Error(message) as Error & { retryAfterSeconds?: number };
    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
      error.retryAfterSeconds = retryAfterSeconds;
    }
    throw error;
  }

  return (await res.json()) as ResendConfirmationResponse;
};

export const fetchRegistrationStatus = async (
  slug: string,
  options: { email?: string; userId?: number | null },
): Promise<RegistrationStatusResponse> => {
  const params = new URLSearchParams();
  if (options.email) params.set("email", options.email);
  if (options.userId && Number.isInteger(options.userId)) {
    params.set("user_id", String(options.userId));
  }
  const res = await fetch(
    `/api/webinars/${encodeURIComponent(slug)}/registration-status?${params.toString()}`,
    {
      credentials: "include",
    },
  );
  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }

  return (await res.json()) as RegistrationStatusResponse;
};

export const createWebinarPaymentSession = async (
  slug: string,
  payload: WebinarPaymentSessionPayload,
): Promise<WebinarPaymentSessionResponse> => {
  const res = await fetch(`/api/webinars/${encodeURIComponent(slug)}/payment-session`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }

  return (await res.json()) as WebinarPaymentSessionResponse;
};

export const submitWebinarPaymentProof = async (
  slug: string,
  payload: WebinarPaymentProofPayload,
): Promise<WebinarPaymentProofResponse> => {
  const res = await fetch(`/api/webinars/${encodeURIComponent(slug)}/payment-proof`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }

  return (await res.json()) as WebinarPaymentProofResponse;
};

export const listWebinarPaymentProofs = async (
  slug: string,
  status?: "submitted" | "approved" | "rejected",
): Promise<WebinarAdminPaymentProof[]> => {
  const params = new URLSearchParams();
  if (status) params.set("status", status);

  const suffix = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`/api/webinars/${encodeURIComponent(slug)}/payment-proofs${suffix}`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }

  const payload = (await res.json()) as WebinarAdminPaymentProofListResponse;
  return payload.data;
};

const postAdminPaymentAction = async (
  slug: string,
  path: "payment-approve" | "payment-reject",
  body: { registration_id: string; review_notes?: string },
): Promise<WebinarPaymentReviewResponse> => {
  const res = await fetch(`/api/webinars/${encodeURIComponent(slug)}/${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }

  return (await res.json()) as WebinarPaymentReviewResponse;
};

export const approveWebinarPaymentProof = async (
  slug: string,
  registrationId: string,
  reviewNotes = "",
) =>
  postAdminPaymentAction(slug, "payment-approve", {
    registration_id: registrationId,
    review_notes: reviewNotes,
  });

export const rejectWebinarPaymentProof = async (
  slug: string,
  registrationId: string,
  reviewNotes = "",
) =>
  postAdminPaymentAction(slug, "payment-reject", {
    registration_id: registrationId,
    review_notes: reviewNotes,
  });

export const sendWebinarZoomLinks = async (
  slug: string,
): Promise<WebinarSendZoomLinksResponse> => {
  const res = await fetch(`/api/webinars/${encodeURIComponent(slug)}/send-zoom-links`, {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }

  return (await res.json()) as WebinarSendZoomLinksResponse;
};
