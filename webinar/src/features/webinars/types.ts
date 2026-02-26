export type WebinarPaymentStatus =
  | "unpaid"
  | "payment_pending"
  | "paid"
  | "failed"
  | "refunded";

export interface Webinar {
  id: string;
  slug: string;
  title: string;
  topic: string;
  description: string;
  start_at: string;
  end_at: string;
  timezone: string;
  capacity: number | null;
  price_cents: number | null;
  currency: string;
  verified_count: number;
  available_seats: number | null;
  is_full: boolean;
  is_published: boolean;
  registration_open: boolean;
}

export interface WebinarListResponse {
  data: Webinar[];
  count: number;
}

export interface WebinarSingleResponse {
  data: Webinar;
}

export interface WebinarRegisterPayload {
  full_name: string;
  email: string;
  user_id?: number;
  optional_fields?: Record<string, string>;
}

export interface WebinarRegisterResponse {
  registration_id: string;
  webinar_slug: string;
  email: string;
  status: "pending";
  message: string;
}

export interface VerifyResponse {
  ok: boolean;
  webinar_slug: string;
  webinar_title: string;
  email: string;
  full_name: string;
  join_url_included: boolean;
  payment_required: boolean;
  payment_status: WebinarPaymentStatus;
  paid_at: string | null;
  confirmation_ready: boolean;
  message: string;
}

export interface ResendConfirmationResponse {
  ok: boolean;
  webinar_slug: string;
  email: string;
  message: string;
}

export interface RegistrationStatusResponse {
  ok: boolean;
  webinar_slug: string;
  email: string | null;
  user_id: number | null;
  registered: boolean;
  status: "pending" | "verified" | "cancelled" | null;
  payment_required: boolean | null;
  payment_status: WebinarPaymentStatus | null;
  paid_at: string | null;
  confirmation_ready: boolean;
}

export interface WebinarPaymentSessionPayload {
  email?: string;
  user_id?: number;
}

export interface WebinarPaymentSessionResponse {
  ok: boolean;
  webinar_slug: string;
  webinar_title: string;
  email: string;
  payment_required: boolean;
  payment_status: WebinarPaymentStatus;
  already_paid: boolean;
  amount_cents: number | null;
  currency: string;
  checkout_url: string | null;
  checkout_id: string | null;
  message: string;
}
