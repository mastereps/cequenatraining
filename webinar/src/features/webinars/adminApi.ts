import type { Webinar } from "./types";

/**
 * The admin payload is the public one plus the Zoom link, which the public
 * endpoints omit because it is only mailed to confirmed registrants.
 */
export interface AdminWebinar extends Webinar {
  zoom_join_url: string | null;
}

/** Everything the webinar editor can send. A PATCH may send any subset. */
export type WebinarInput = {
  slug?: string;
  title: string;
  topic: string;
  description: string;
  start_at: string;
  end_at: string;
  timezone: string;
  capacity: number | null;
  price_cents: number | null;
  is_published: boolean;
  registration_open: boolean;
  zoom_join_url: string | null;
  poster_image_url: string | null;
  payment_qr_image_url: string | null;
  payment_instructions: string | null;
  join_link_delivery_mode: "auto" | "manual";
};

export type ReschedulePayload = {
  start_at: string;
  end_at: string;
  timezone?: string;
  notify_registrants: boolean;
};

const getErrorMessage = async (res: Response) => {
  try {
    const payload = (await res.json()) as { error?: string };
    return payload.error || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
};

const request = async (url: string, init?: RequestInit): Promise<AdminWebinar> => {
  const res = await fetch(url, { credentials: "include", ...init });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }
  const payload = (await res.json()) as { webinar: AdminWebinar };
  return payload.webinar;
};

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

/** Admin: every webinar - drafts, finished, and archived included. */
export const fetchAdminWebinars = async (): Promise<AdminWebinar[]> => {
  const res = await fetch("/api/admin/webinars", { credentials: "include" });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }
  const payload = (await res.json()) as { webinars: AdminWebinar[] };
  return payload.webinars;
};

export const createWebinar = (input: WebinarInput) =>
  request("/api/admin/webinars", jsonInit("POST", input));

export const updateWebinar = (id: string, input: Partial<WebinarInput>) =>
  request(`/api/admin/webinars/${id}`, jsonInit("PATCH", input));

/**
 * Moving the event. Kept separate from updateWebinar because this is the one
 * edit that can notify everyone who already registered.
 */
export const rescheduleWebinar = async (
  id: string,
  payload: ReschedulePayload,
): Promise<{ webinar: AdminWebinar; notified_count: number }> => {
  const res = await fetch(`/api/admin/webinars/${id}/reschedule`, {
    credentials: "include",
    ...jsonInit("POST", payload),
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }
  return (await res.json()) as { webinar: AdminWebinar; notified_count: number };
};

/** Archives the webinar; registrations and payment history are kept. */
export const archiveWebinar = (id: string) =>
  request(`/api/admin/webinars/${id}`, { method: "DELETE" });

export const restoreWebinar = (id: string) =>
  request(`/api/admin/webinars/${id}/restore`, { method: "POST" });

/** Uploads a poster or payment QR image, returns its served url. */
export const uploadWebinarImage = async (file: File): Promise<string> => {
  const body = new FormData();
  body.append("image", file);
  const res = await fetch("/api/admin/webinars/uploads", {
    method: "POST",
    credentials: "include",
    body,
  });
  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }
  const payload = (await res.json()) as { url: string };
  return payload.url;
};
