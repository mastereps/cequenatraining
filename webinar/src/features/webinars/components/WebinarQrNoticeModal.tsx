import { useEffect } from "react";
import type { ReactNode } from "react";

interface WebinarQrNoticeModalProps {
  open: boolean;
  onClose: () => void;
  heading: string;
  notice: string;
  supportingText: string;
  imageUrl?: string | null;
  imageAlt?: string;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  secondaryActionLabel?: string;
  supportActionLabel?: string;
  supportActionHref?: string | null;
  children?: ReactNode;
}

const WebinarQrNoticeModal = ({
  open,
  onClose,
  heading,
  notice,
  supportingText,
  imageUrl,
  imageAlt,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel = "Close",
  supportActionLabel,
  supportActionHref,
  children,
}: WebinarQrNoticeModalProps) => {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] overflow-y-auto bg-slate-950/72 px-4 py-6 backdrop-blur-sm sm:px-6 sm:py-10"
      onClick={onClose}
      role="presentation"
    >
      <div className="mx-auto flex min-h-full w-full max-w-3xl items-center justify-center">
        <div
          className="w-full rounded-[28px] border border-slate-200 bg-white p-5 text-left shadow-[0_28px_90px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-950 sm:p-7"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={heading}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                Registration reminder
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white sm:text-3xl">
                {heading}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              {secondaryActionLabel}
            </button>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(240px,0.95fr)] lg:items-start">
            <div className="space-y-4">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100">
                <p className="text-sm font-semibold uppercase tracking-[0.12em]">{notice}</p>
                <p className="mt-2 text-sm leading-6">{supportingText}</p>
              </div>

              {children ? <div className="space-y-4">{children}</div> : null}
            </div>

            <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={imageAlt || heading}
                  className="mx-auto w-full max-w-[320px] rounded-[20px] border border-emerald-200 bg-white p-3 shadow-sm dark:border-emerald-900/40"
                />
              ) : (
                <div className="flex min-h-[240px] items-center justify-center rounded-[20px] border border-dashed border-emerald-200 bg-white/80 p-6 text-center text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-slate-950/70 dark:text-emerald-100">
                  QR image is not available yet.
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {supportActionLabel && supportActionHref ? (
              <a
                href={supportActionHref}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                {supportActionLabel}
              </a>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              {secondaryActionLabel}
            </button>
            <button
              type="button"
              onClick={onPrimaryAction}
              className="rounded-xl bg-[#00a34a] px-5 py-3 text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
            >
              {primaryActionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebinarQrNoticeModal;
