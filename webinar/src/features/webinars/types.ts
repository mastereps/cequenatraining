export type WebinarPaymentStatus =
  | "unpaid"
  | "proof_submitted"
  | "paid"
  | "rejected"
  | "refunded";

export interface WebinarPaymentProof {
  id: string;
  reference_number: string;
  payer_name: string;
  payer_gcash_number: string;
  amount_cents: number | null;
  status: "submitted" | "approved" | "rejected";
  review_notes: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: number | null;
}

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
  poster_image_url: string | null;
  payment_qr_image_url: string | null;
  payment_instructions: string | null;
  join_link_delivery_mode: "auto" | "manual";
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
  zoom_link_sent_at: string | null;
  confirmation_ready: boolean;
  message: string;
}

export interface ResendConfirmationResponse {
  ok: boolean;
  webinar_slug: string;
  email: string;
  message: string;
  next_allowed_in_seconds?: number;
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
  payment_proof: WebinarPaymentProof | null;
  zoom_link_sent_at: string | null;
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

export interface WebinarPaymentProofPayload {
  email?: string;
  user_id?: number | null;
  reference_number: string;
  payer_name: string;
  payer_gcash_number: string;
}

export interface WebinarPaymentProofResponse {
  ok: boolean;
  webinar_slug: string;
  email: string;
  payment_status: WebinarPaymentStatus;
  proof: WebinarPaymentProof;
  message: string;
}

export interface WebinarAdminPaymentProof {
  registration_id: string;
  email: string;
  full_name: string;
  registration_status: "pending" | "verified" | "cancelled";
  payment_status: WebinarPaymentStatus;
  paid_at: string | null;
  zoom_link_sent_at: string | null;
  payment_proof: WebinarPaymentProof & {
    reviewed_by_name?: string | null;
  };
}

export interface WebinarAdminPaymentProofListResponse {
  ok: boolean;
  data: WebinarAdminPaymentProof[];
  count: number;
}

export interface WebinarPaymentReviewResponse {
  ok: boolean;
  webinar_slug: string;
  registration_id: string;
  payment_status: WebinarPaymentStatus;
  message: string;
}

export interface WebinarSendZoomLinksResponse {
  ok: boolean;
  webinar_slug: string;
  sent_count: number;
  message: string;
}
