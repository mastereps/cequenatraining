import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AiOutlineCalendar,
  AiOutlineCreditCard,
  AiOutlineDelete,
  AiOutlineEdit,
  AiOutlineFolderOpen,
  AiOutlineHistory,
  AiOutlinePlus,
  AiOutlineUndo,
  AiOutlineVideoCamera,
} from "react-icons/ai";
import {
  archiveWebinar,
  createWebinar,
  fetchAdminWebinars,
  rescheduleWebinar,
  restoreWebinar,
  updateWebinar,
  uploadWebinarImage,
  type AdminWebinar,
  type WebinarInput,
} from "../../features/webinars/adminApi";
import { formatManilaDateTime } from "../../features/webinars/format";
import { getWebinarPlaceholder } from "../../features/webinars/placeholders";
import ConfirmDialog from "./ConfirmDialog";

type Tab = "upcoming" | "past" | "drafts" | "archived";

const TABS: { id: Tab; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "drafts", label: "Drafts" },
  { id: "archived", label: "Archived" },
];

type FormState = {
  title: string;
  slug: string;
  topic: string;
  description: string;
  start_at: string;
  end_at: string;
  timezone: string;
  capacity: string;
  price: string;
  is_published: boolean;
  registration_open: boolean;
  join_link_delivery_mode: "auto" | "manual";
  zoom_join_url: string;
  poster_image_url: string;
  payment_qr_image_url: string;
  payment_instructions: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  slug: "",
  topic: "General",
  description: "",
  start_at: "",
  end_at: "",
  timezone: "Asia/Manila",
  capacity: "",
  price: "",
  is_published: false,
  registration_open: true,
  join_link_delivery_mode: "manual",
  zoom_join_url: "",
  poster_image_url: "",
  payment_qr_image_url: "",
  payment_instructions: "",
};

/**
 * <input type="datetime-local"> speaks the browser's local time, so the value is
 * built from local parts rather than the UTC-based toISOString().
 */
const toLocalInput = (iso: string) => {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
};

const toForm = (webinar: AdminWebinar): FormState => ({
  title: webinar.title,
  slug: webinar.slug,
  topic: webinar.topic,
  description: webinar.description,
  start_at: toLocalInput(webinar.start_at),
  end_at: toLocalInput(webinar.end_at),
  timezone: webinar.timezone,
  capacity: webinar.capacity === null ? "" : String(webinar.capacity),
  price: webinar.price_cents === null ? "" : (webinar.price_cents / 100).toFixed(2),
  is_published: webinar.is_published,
  registration_open: webinar.registration_open,
  join_link_delivery_mode: webinar.join_link_delivery_mode,
  zoom_join_url: webinar.zoom_join_url ?? "",
  poster_image_url: webinar.poster_image_url ?? "",
  payment_qr_image_url: webinar.payment_qr_image_url ?? "",
  payment_instructions: webinar.payment_instructions ?? "",
});

const optionalInt = (value: string) => {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
};

const toInput = (form: FormState): WebinarInput => ({
  title: form.title.trim(),
  slug: form.slug.trim(),
  topic: form.topic.trim(),
  description: form.description.trim(),
  start_at: new Date(form.start_at).toISOString(),
  end_at: new Date(form.end_at).toISOString(),
  timezone: form.timezone.trim(),
  capacity: optionalInt(form.capacity),
  price_cents:
    form.price.trim() === "" ? null : Math.round(Number(form.price.trim()) * 100),
  is_published: form.is_published,
  registration_open: form.registration_open,
  join_link_delivery_mode: form.join_link_delivery_mode,
  zoom_join_url: form.zoom_join_url.trim() || null,
  poster_image_url: form.poster_image_url.trim() || null,
  payment_qr_image_url: form.payment_qr_image_url.trim() || null,
  payment_instructions: form.payment_instructions.trim() || null,
});

const formatPesos = (priceCents: number | null) =>
  priceCents === null || priceCents === 0
    ? "Free"
    : new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
        priceCents / 100,
      );

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-lantern dark:border-white/10 dark:bg-white/5";
const labelClass = "mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500";
const pillClass = "rounded-full px-2 py-0.5 text-[11px] font-semibold";
const actionBtnClass =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold transition hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5";

const EMPTY_STATES: Record<Tab, { title: string; body: string }> = {
  upcoming: {
    title: "No upcoming webinars",
    body: "Scheduled webinars with a future start time will appear here.",
  },
  past: {
    title: "No past webinars",
    body: "Webinars that have already taken place will appear here.",
  },
  drafts: {
    title: "No draft webinars found",
    body: "You don't have any draft webinars yet.",
  },
  archived: {
    title: "No archived webinars",
    body: "Webinars you archive will appear here and can be restored.",
  },
};

const AdminWebinarsPage = () => {
  const [webinars, setWebinars] = useState<AdminWebinar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("upcoming");

  // null = the form is closed, "" = adding, otherwise the id being edited.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"poster" | "qr" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<AdminWebinar | null>(null);

  // Reschedule is its own dialog: it is the one edit that can email registrants.
  const [rescheduling, setRescheduling] = useState<AdminWebinar | null>(null);
  const [rescheduleForm, setRescheduleForm] = useState({
    start_at: "",
    end_at: "",
    notify: false,
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setWebinars(await fetchAdminWebinars());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load webinars.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  // Success messages clear themselves; errors stay until dismissed or replaced.
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  const counts = useMemo(() => {
    const now = Date.now();
    const live = webinars.filter((webinar) => !webinar.archived_at);
    return {
      upcoming: live.filter(
        (webinar) => webinar.is_published && new Date(webinar.start_at).getTime() >= now,
      ).length,
      past: live.filter(
        (webinar) => webinar.is_published && new Date(webinar.start_at).getTime() < now,
      ).length,
      drafts: live.filter((webinar) => !webinar.is_published).length,
      archived: webinars.filter((webinar) => webinar.archived_at).length,
    };
  }, [webinars]);

  const visible = useMemo(() => {
    const now = Date.now();
    if (tab === "archived") return webinars.filter((webinar) => webinar.archived_at);

    const live = webinars.filter((webinar) => !webinar.archived_at);
    if (tab === "drafts") return live.filter((webinar) => !webinar.is_published);
    return live.filter(
      (webinar) =>
        webinar.is_published &&
        (tab === "upcoming"
          ? new Date(webinar.start_at).getTime() >= now
          : new Date(webinar.start_at).getTime() < now),
    );
  }, [webinars, tab]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId("");
    setError(null);
    setMessage(null);
  };

  const openEdit = (webinar: AdminWebinar) => {
    setForm(toForm(webinar));
    setEditingId(webinar.id);
    setError(null);
    setMessage(null);
  };

  const handleSave = async () => {
    if (!form.start_at || !form.end_at) {
      setError("A start and end date and time are both required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const input = toInput(form);
      if (editingId) {
        await updateWebinar(editingId, input);
        setMessage(`Saved "${input.title}".`);
      } else {
        await createWebinar(input);
        setMessage(`Created "${input.title}".`);
      }
      setEditingId(null);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save the webinar.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file: File, target: "poster" | "qr") => {
    setUploading(target);
    setError(null);
    try {
      const url = await uploadWebinarImage(file);
      setField(target === "poster" ? "poster_image_url" : "payment_qr_image_url", url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploading(null);
    }
  };

  const openReschedule = (webinar: AdminWebinar) => {
    setRescheduling(webinar);
    setRescheduleForm({
      start_at: toLocalInput(webinar.start_at),
      end_at: toLocalInput(webinar.end_at),
      notify: false,
    });
    setError(null);
    setMessage(null);
  };

  const handleReschedule = async () => {
    if (!rescheduling) return;
    setBusyId(rescheduling.id);
    setError(null);
    try {
      const result = await rescheduleWebinar(rescheduling.id, {
        start_at: new Date(rescheduleForm.start_at).toISOString(),
        end_at: new Date(rescheduleForm.end_at).toISOString(),
        notify_registrants: rescheduleForm.notify,
      });
      setMessage(
        result.notified_count > 0
          ? `Rescheduled. ${result.notified_count} registrant${
              result.notified_count === 1 ? "" : "s"
            } will be emailed.`
          : "Rescheduled. No one was emailed.",
      );
      setRescheduling(null);
      await load();
    } catch (rescheduleError) {
      setError(
        rescheduleError instanceof Error ? rescheduleError.message : "Unable to reschedule.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleArchiveToggle = async (webinar: AdminWebinar) => {
    setBusyId(webinar.id);
    setError(null);
    try {
      if (webinar.archived_at) {
        await restoreWebinar(webinar.id);
        setMessage(`Restored "${webinar.title}".`);
      } else {
        await archiveWebinar(webinar.id);
        setMessage(`Archived "${webinar.title}".`);
      }
      setConfirming(null);
      await load();
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Unable to update.");
    } finally {
      setBusyId(null);
    }
  };

  const renderStatus = (webinar: AdminWebinar, archived: boolean) => (
    <div className="flex flex-wrap items-start gap-1">
      <span
        className={`${pillClass} ${
          webinar.is_published
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            : "bg-slate-500/15 text-slate-500"
        }`}
      >
        {webinar.is_published ? "Published" : "Draft"}
      </span>
      {!archived && webinar.registration_open && (
        <span className={`${pillClass} bg-sky-500/15 text-sky-600 dark:text-sky-400`}>Open</span>
      )}
      {webinar.is_full && (
        <span className={`${pillClass} bg-amber-500/15 text-amber-600`}>Full</span>
      )}
      {archived && (
        <span className={`${pillClass} bg-red-500/15 text-red-600 dark:text-red-400`}>
          Archived
        </span>
      )}
    </div>
  );

  const renderActions = (webinar: AdminWebinar, archived: boolean) => (
    <>
      <button type="button" onClick={() => openEdit(webinar)} className={actionBtnClass}>
        <AiOutlineEdit aria-hidden="true" className="text-sm" />
        Edit
      </button>
      <button type="button" onClick={() => openReschedule(webinar)} className={actionBtnClass}>
        <AiOutlineHistory aria-hidden="true" className="text-sm" />
        Reschedule
      </button>
      <Link to={`/admin/webinars/${webinar.slug}/payments`} className={actionBtnClass}>
        <AiOutlineCreditCard aria-hidden="true" className="text-sm" />
        Payments
      </Link>
      <button
        type="button"
        onClick={() =>
          archived ? void handleArchiveToggle(webinar) : setConfirming(webinar)
        }
        disabled={busyId === webinar.id}
        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
          archived
            ? "border-slate-300 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
            : "border-red-500/30 text-red-600 hover:bg-red-500/10 dark:text-red-400"
        }`}
      >
        {archived ? (
          <AiOutlineUndo aria-hidden="true" className="text-sm" />
        ) : (
          <AiOutlineDelete aria-hidden="true" className="text-sm" />
        )}
        {archived ? "Restore" : "Archive"}
      </button>
    </>
  );

  const renderSeats = (webinar: AdminWebinar) =>
    `${webinar.verified_count}${webinar.capacity === null ? " / ∞" : ` / ${webinar.capacity}`}`;

  return (
    <main>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Webinars</h2>
          <p className="text-sm text-slate-500">
            Create, edit, reschedule, and archive webinars.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
        >
          <AiOutlinePlus aria-hidden="true" className="text-base" />
          New webinar
        </button>
      </header>

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setTab(entry.id)}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              tab === entry.id
                ? "bg-lantern/15 text-lantern"
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"
            }`}
          >
            {entry.label}{" "}
            <span className="text-xs opacity-70">({counts[entry.id]})</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
          <span aria-hidden="true" className="text-base leading-none">
            ⚠
          </span>
          <p className="flex-1">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
            className="cursor-pointer leading-none opacity-60 transition hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}
      {message && (
        <div
          role="status"
          className="mb-4 flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-300"
        >
          <span aria-hidden="true" className="text-base leading-none">
            ✓
          </span>
          {message}
        </div>
      )}

      {editingId !== null && (
        <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0b1220]">
          <h3 className="mb-4 text-lg font-semibold">
            {editingId ? "Edit webinar" : "New webinar"}
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="webinar-title">
                Title
              </label>
              <input
                id="webinar-title"
                className={inputClass}
                value={form.title}
                onChange={(event) => setField("title", event.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="webinar-slug">
                Url slug
              </label>
              <input
                id="webinar-slug"
                className={inputClass}
                placeholder="left blank, built from the title"
                value={form.slug}
                onChange={(event) => setField("slug", event.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="webinar-topic">
                Topic
              </label>
              <input
                id="webinar-topic"
                className={inputClass}
                value={form.topic}
                onChange={(event) => setField("topic", event.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="webinar-timezone">
                Timezone label
              </label>
              <input
                id="webinar-timezone"
                className={inputClass}
                value={form.timezone}
                onChange={(event) => setField("timezone", event.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="webinar-start">
                Starts
              </label>
              <input
                id="webinar-start"
                type="datetime-local"
                className={inputClass}
                value={form.start_at}
                onChange={(event) => setField("start_at", event.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="webinar-end">
                Ends
              </label>
              <input
                id="webinar-end"
                type="datetime-local"
                className={inputClass}
                value={form.end_at}
                onChange={(event) => setField("end_at", event.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="webinar-capacity">
                Capacity
              </label>
              <input
                id="webinar-capacity"
                className={inputClass}
                inputMode="numeric"
                placeholder="blank for unlimited"
                value={form.capacity}
                onChange={(event) => setField("capacity", event.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="webinar-price">
                Price (PHP)
              </label>
              <input
                id="webinar-price"
                className={inputClass}
                inputMode="decimal"
                placeholder="blank for free"
                value={form.price}
                onChange={(event) => setField("price", event.target.value)}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className={labelClass} htmlFor="webinar-description">
              Description
            </label>
            <textarea
              id="webinar-description"
              className={`${inputClass} min-h-24`}
              value={form.description}
              onChange={(event) => setField("description", event.target.value)}
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="webinar-poster">
                Poster image
              </label>
              <input
                id="webinar-poster"
                className={inputClass}
                placeholder="/images/poster.jpg"
                value={form.poster_image_url}
                onChange={(event) => setField("poster_image_url", event.target.value)}
              />
              <input
                type="file"
                accept="image/*"
                className="mt-2 text-xs"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleUpload(file, "poster");
                }}
              />
              {uploading === "poster" && <p className="text-xs text-slate-400">Uploading…</p>}
              <div className="mt-3">
                <div className="relative aspect-[16/10] w-full max-w-[240px] overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                  <img
                    src={form.poster_image_url.trim() || getWebinarPlaceholder(form.topic, editingId ?? "")}
                    alt="Poster preview"
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {form.poster_image_url.trim()
                    ? "This poster will appear on the webinar card."
                    : "No poster set — a default placeholder is shown on the card until you upload one."}
                </p>
              </div>
            </div>
            <div>
              <label className={labelClass} htmlFor="webinar-qr">
                Payment QR image
              </label>
              <input
                id="webinar-qr"
                className={inputClass}
                placeholder="/images/G-cash.jpg"
                value={form.payment_qr_image_url}
                onChange={(event) => setField("payment_qr_image_url", event.target.value)}
              />
              <input
                type="file"
                accept="image/*"
                className="mt-2 text-xs"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleUpload(file, "qr");
                }}
              />
              {uploading === "qr" && <p className="text-xs text-slate-400">Uploading…</p>}
            </div>
            <div>
              <label className={labelClass} htmlFor="webinar-zoom">
                Zoom join link
              </label>
              <input
                id="webinar-zoom"
                className={inputClass}
                placeholder="https://zoom.us/j/…"
                value={form.zoom_join_url}
                onChange={(event) => setField("zoom_join_url", event.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="webinar-delivery">
                Join link delivery
              </label>
              <select
                id="webinar-delivery"
                className={inputClass}
                value={form.join_link_delivery_mode}
                onChange={(event) =>
                  setField(
                    "join_link_delivery_mode",
                    event.target.value as FormState["join_link_delivery_mode"],
                  )
                }
              >
                <option value="manual">Manual - send links yourself</option>
                <option value="auto">Auto - send on confirmation</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className={labelClass} htmlFor="webinar-instructions">
              Payment instructions
            </label>
            <textarea
              id="webinar-instructions"
              className={`${inputClass} min-h-20`}
              value={form.payment_instructions}
              onChange={(event) => setField("payment_instructions", event.target.value)}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-6">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(event) => setField("is_published", event.target.checked)}
              />
              Published (visible on the site)
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.registration_open}
                onChange={(event) => setField("registration_open", event.target.checked)}
              />
              Registration open
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="cursor-pointer rounded border border-slate-300 px-5 py-2 text-sm font-semibold dark:border-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="cursor-pointer rounded bg-emerald-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save webinar"}
            </button>
          </div>
        </section>
      )}

      {loading ? (
        <p>Loading webinars…</p>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-slate-200 bg-white px-6 py-14 text-center dark:border-white/10 dark:bg-[#0b1220]">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl text-slate-400 dark:bg-white/5">
            <AiOutlineFolderOpen aria-hidden="true" />
          </span>
          <p className="text-base font-semibold">{EMPTY_STATES[tab].title}</p>
          <p className="text-sm text-slate-500">{EMPTY_STATES[tab].body}</p>
          <button
            type="button"
            onClick={openAdd}
            className="mt-1 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            <AiOutlinePlus aria-hidden="true" className="text-base" />
            New webinar
          </button>
        </div>
      ) : (
        <>
          {/* Desktop: table. Below lg (where the sidebar also collapses), the rows
              reflow into cards so nothing hides behind a horizontal scrollbar. */}
          <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white lg:block dark:border-white/10 dark:bg-[#0b1220]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.08em] text-slate-500 dark:border-white/10">
                <tr>
                  <th className="px-4 py-3">Webinar</th>
                  <th className="px-4 py-3">Schedule</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Seats</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((webinar) => {
                  const archived = Boolean(webinar.archived_at);
                  return (
                    <tr
                      key={webinar.id}
                      className={`border-b border-slate-100 last:border-0 dark:border-white/5 ${
                        archived ? "opacity-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-300">
                            <AiOutlineVideoCamera aria-hidden="true" />
                          </span>
                          <p className="font-semibold">{webinar.title}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="flex items-center gap-2">
                          <AiOutlineCalendar aria-hidden="true" className="text-slate-400" />
                          {formatManilaDateTime(webinar.start_at)}
                        </span>
                        <span className="mt-0.5 block pl-6 text-xs text-slate-400">
                          {webinar.timezone}
                        </span>
                      </td>
                      <td className="px-4 py-3">{renderStatus(webinar, archived)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{renderSeats(webinar)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatPesos(webinar.price_cents)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          {renderActions(webinar, archived)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Tablet / mobile: stacked cards. */}
          <div className="grid gap-3 lg:hidden">
            {visible.map((webinar) => {
              const archived = Boolean(webinar.archived_at);
              return (
                <div
                  key={webinar.id}
                  className={`rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0b1220] ${
                    archived ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-300">
                      <AiOutlineVideoCamera aria-hidden="true" />
                    </span>
                    <p className="flex-1 font-semibold leading-snug">{webinar.title}</p>
                    {renderStatus(webinar, archived)}
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div className="col-span-2">
                      <dt className="text-xs uppercase tracking-[0.08em] text-slate-400">
                        Schedule
                      </dt>
                      <dd className="mt-0.5 flex items-center gap-2">
                        <AiOutlineCalendar aria-hidden="true" className="text-slate-400" />
                        <span>
                          {formatManilaDateTime(webinar.start_at)}
                          <span className="block text-xs text-slate-400">{webinar.timezone}</span>
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-[0.08em] text-slate-400">Seats</dt>
                      <dd className="mt-0.5">{renderSeats(webinar)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-[0.08em] text-slate-400">Price</dt>
                      <dd className="mt-0.5">{formatPesos(webinar.price_cents)}</dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-white/5">
                    {renderActions(webinar, archived)}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {rescheduling && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm"
          onClick={() => setRescheduling(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reschedule-title"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0b1220]"
          >
            <h2 id="reschedule-title" className="text-lg font-semibold">
              Reschedule “{rescheduling.title}”
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Currently {formatManilaDateTime(rescheduling.start_at)}.
            </p>

            <div className="mt-4 grid gap-4">
              <div>
                <label className={labelClass} htmlFor="reschedule-start">
                  New start
                </label>
                <input
                  id="reschedule-start"
                  type="datetime-local"
                  className={inputClass}
                  value={rescheduleForm.start_at}
                  onChange={(event) =>
                    setRescheduleForm((current) => ({ ...current, start_at: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="reschedule-end">
                  New end
                </label>
                <input
                  id="reschedule-end"
                  type="datetime-local"
                  className={inputClass}
                  value={rescheduleForm.end_at}
                  onChange={(event) =>
                    setRescheduleForm((current) => ({ ...current, end_at: event.target.value }))
                  }
                />
              </div>
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={rescheduleForm.notify}
                  onChange={(event) =>
                    setRescheduleForm((current) => ({ ...current, notify: event.target.checked }))
                  }
                />
                <span>
                  Email the {rescheduling.verified_count} confirmed registrant
                  {rescheduling.verified_count === 1 ? "" : "s"} about the new schedule
                </span>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRescheduling(null)}
                className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold transition hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleReschedule()}
                disabled={busyId === rescheduling.id}
                className="cursor-pointer rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
              >
                {busyId === rescheduling.id ? "Working…" : "Reschedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirming && (
        <ConfirmDialog
          title={`Archive "${confirming.title}"?`}
          body="It disappears from the site right away and stops taking registrations. Existing registrations and payment records are kept, and you can restore it later from this page."
          confirmLabel="Archive webinar"
          busy={busyId === confirming.id}
          onConfirm={() => void handleArchiveToggle(confirming)}
          onCancel={() => setConfirming(null)}
        />
      )}
    </main>
  );
};

export default AdminWebinarsPage;
