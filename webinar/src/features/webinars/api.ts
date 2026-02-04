import type {
  ResendConfirmationResponse,
  VerifyResponse,
  Webinar,
  WebinarListResponse,
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
  const res = await fetch(`/api/webinars${toQueryString(filters)}`);
  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }

  const payload = (await res.json()) as WebinarListResponse;
  return payload.data;
};

export const fetchWebinarBySlug = async (slug: string): Promise<Webinar> => {
  const res = await fetch(`/api/webinars/${encodeURIComponent(slug)}`);
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
  const res = await fetch(`/api/verify?token=${encodeURIComponent(token)}`);
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
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }

  return (await res.json()) as ResendConfirmationResponse;
};
