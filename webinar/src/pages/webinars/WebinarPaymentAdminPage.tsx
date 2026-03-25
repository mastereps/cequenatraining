import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  approveWebinarPaymentProof,
  fetchWebinarBySlug,
  listWebinarPaymentProofs,
  rejectWebinarPaymentProof,
  sendWebinarZoomLinks,
} from "../../features/webinars/api";
import type { Webinar, WebinarAdminPaymentProof } from "../../features/webinars/types";
import { useAuth } from "../../store/AuthContext";
import { formatManilaDateTime } from "../../features/webinars/format";
import { formatPrice } from "../../utils/formatPrice";

const FILTER_OPTIONS = [
  { value: "", label: "All" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
] as const;

const WebinarPaymentAdminPage = () => {
  const { slug = "" } = useParams();
  const { user } = useAuth();
  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [rows, setRows] = useState<WebinarAdminPaymentProof[]>([]);
  const [statusFilter, setStatusFilter] = useState<"" | "submitted" | "approved" | "rejected">("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [sendingZoom, setSendingZoom] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isAdmin = String(user?.role || "").trim().toLowerCase() === "admin";

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const [webinarResponse, proofRows] = await Promise.all([
        fetchWebinarBySlug(slug),
        listWebinarPaymentProofs(slug, statusFilter || undefined),
      ]);
      setWebinar(webinarResponse);
      setRows(proofRows);
    } catch (loadError) {
      const loadMessage =
        loadError instanceof Error ? loadError.message : "Unable to load payment review data.";
      setError(loadMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    void load();
  }, [slug, statusFilter, isAdmin]);

  const handleReview = async (
    registrationId: string,
    action: "approve" | "reject",
  ) => {
    setActionId(registrationId);
    setError(null);
    setMessage(null);

    try {
      const reviewNote = reviewNotes[registrationId] || "";
      const response =
        action === "approve"
          ? await approveWebinarPaymentProof(slug, registrationId, reviewNote)
          : await rejectWebinarPaymentProof(slug, registrationId, reviewNote);
      setMessage(response.message);
      await load();
    } catch (reviewError) {
      const reviewMessage =
        reviewError instanceof Error ? reviewError.message : "Unable to review payment proof.";
      setError(reviewMessage);
    } finally {
      setActionId(null);
    }
  };

  const handleSendZoomLinks = async () => {
    setSendingZoom(true);
    setError(null);
    setMessage(null);

    try {
      const response = await sendWebinarZoomLinks(slug);
      setMessage(response.message);
      await load();
    } catch (sendError) {
      const sendMessage =
        sendError instanceof Error ? sendError.message : "Unable to send Zoom links.";
      setError(sendMessage);
    } finally {
      setSendingZoom(false);
    }
  };

  if (!isAdmin) {
    return (
      <main className="mx-auto mt-28 max-w-[900px] px-4 pb-20">
        <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">
          Admin access is required.
        </div>
      </main>
    );
  }

  if (loading) {
    return <main className="mx-auto mt-28 max-w-[1100px] px-4">Loading payment review...</main>;
  }

  return (
    <main className="mx-auto mt-28 max-w-[1100px] px-4 pb-20">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="headline-gradient mb-2 font-text text-lg font-bold uppercase tracking-[0.08em]">
            Admin review
          </p>
          <h1 className="font-heading text-4xl uppercase">
            {webinar ? webinar.title : "Webinar payments"}
          </h1>
          {webinar ? (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              {formatManilaDateTime(webinar.start_at)}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "" | "submitted" | "approved" | "rejected")
            }
            className="rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          >
            {FILTER_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleSendZoomLinks}
            disabled={sendingZoom}
            className="rounded bg-slate-900 px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          >
            {sendingZoom ? "Sending..." : "Send Zoom links"}
          </button>
          <Link
            to={`/webinars/${slug}`}
            className="rounded border border-slate-300 px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Back to webinar
          </Link>
        </div>
      </header>

      {error ? <div className="mb-4 rounded border border-red-200 bg-red-50 p-4 text-red-700">{error}</div> : null}
      {message ? <div className="mb-4 rounded border border-green-200 bg-green-50 p-4 text-green-700">{message}</div> : null}

      {rows.length === 0 ? (
        <div className="rounded border border-slate-200 bg-white p-6 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          No payment proofs found for the current filter.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <section
              key={row.registration_id}
              className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
                  <p className="text-lg font-semibold uppercase tracking-[0.05em]">{row.full_name}</p>
                  <p>{row.email}</p>
                  <p>
                    <strong>Reference:</strong> {row.payment_proof.reference_number}
                  </p>
                  <p>
                    <strong>GCash number:</strong> {row.payment_proof.payer_gcash_number}
                  </p>
                  <p>
                    <strong>Amount:</strong> {formatPrice(row.payment_proof.amount_cents || 0, webinar?.currency || "PHP")}
                  </p>
                  <p>
                    <strong>Submitted:</strong> {row.payment_proof.submitted_at ? formatManilaDateTime(row.payment_proof.submitted_at) : "N/A"}
                  </p>
                  <p>
                    <strong>Status:</strong> {row.payment_status}
                  </p>
                  {row.zoom_link_sent_at ? (
                    <p>
                      <strong>Zoom sent:</strong> {formatManilaDateTime(row.zoom_link_sent_at)}
                    </p>
                  ) : null}
                  {row.payment_proof.reviewed_by_name ? (
                    <p>
                      <strong>Reviewed by:</strong> {row.payment_proof.reviewed_by_name}
                    </p>
                  ) : null}
                  {row.payment_proof.review_notes ? (
                    <p>
                      <strong>Review notes:</strong> {row.payment_proof.review_notes}
                    </p>
                  ) : null}
                </div>

                <div className="min-w-[260px] max-w-[320px] flex-1">
                  <label
                    htmlFor={`review-notes-${row.registration_id}`}
                    className="mb-1 block text-sm font-semibold"
                  >
                    Review notes
                  </label>
                  <textarea
                    id={`review-notes-${row.registration_id}`}
                    value={reviewNotes[row.registration_id] || ""}
                    onChange={(event) =>
                      setReviewNotes((current) => ({
                        ...current,
                        [row.registration_id]: event.target.value,
                      }))
                    }
                    rows={4}
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                    placeholder="Optional notes for approval or rejection"
                  />

                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void handleReview(row.registration_id, "approve")}
                      disabled={actionId === row.registration_id}
                      className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionId === row.registration_id ? "Working..." : "Approve"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleReview(row.registration_id, "reject")}
                      disabled={actionId === row.registration_id}
                      className="rounded bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionId === row.registration_id ? "Working..." : "Reject"}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
};

export default WebinarPaymentAdminPage;
