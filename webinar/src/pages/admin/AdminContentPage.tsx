import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";
import {
  fetchAdminPageContent,
  updateSection,
  updateSectionOrder,
} from "../../features/content/api";
import { getSectionFields } from "../../features/content/fieldSchemas";
import type { ContentPage, PageSection, SectionContent } from "../../features/content/types";
import ContentFieldsEditor from "./ContentFieldsEditor";

const PAGES: { value: ContentPage; label: string }[] = [
  { value: "home", label: "Home" },
  { value: "about", label: "About" },
];

const AdminContentPage = () => {
  const { user } = useAuth();
  const isAdmin = String(user?.role || "").trim().toLowerCase() === "admin";

  const [page, setPage] = useState<ContentPage>("home");
  const [sections, setSections] = useState<PageSection[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [orderDirty, setOrderDirty] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async (targetPage: ContentPage) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    setOrderDirty(false);
    try {
      const data = await fetchAdminPageContent(targetPage);
      setSections(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load content.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    void load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, isAdmin]);

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    setSections(next.map((section, i) => ({ ...section, sort_order: (i + 1) * 10 })));
    setOrderDirty(true);
  };

  const handleSaveOrder = async () => {
    setSavingOrder(true);
    setError(null);
    setMessage(null);
    try {
      const order = sections.map((section, index) => ({
        section_key: section.section_key,
        sort_order: (index + 1) * 10,
      }));
      const updated = await updateSectionOrder(page, order);
      setSections(updated);
      setOrderDirty(false);
      setMessage("Section order saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save order.");
    } finally {
      setSavingOrder(false);
    }
  };

  const updateLocalContent = (sectionKey: string, content: SectionContent) => {
    setSections((current) =>
      current.map((section) =>
        section.section_key === sectionKey ? { ...section, content } : section,
      ),
    );
  };

  // Persists immediately rather than waiting for a save press: the checkbox is
  // its own control, and there is no save affordance for it outside the Edit
  // panel. Applied optimistically and reverted if the request fails.
  const toggleVisibility = async (section: PageSection) => {
    const nextVisible = !section.is_visible;
    const setVisible = (value: boolean) =>
      setSections((current) =>
        current.map((item) =>
          item.section_key === section.section_key ? { ...item, is_visible: value } : item,
        ),
      );

    setSavingKey(section.section_key);
    setError(null);
    setMessage(null);
    setVisible(nextVisible);
    try {
      const saved = await updateSection(page, section.section_key, { is_visible: nextVisible });
      setSections((current) =>
        current.map((item) => (item.section_key === saved.section_key ? saved : item)),
      );
      setMessage(`"${section.label}" is now ${nextVisible ? "visible" : "hidden"}.`);
    } catch (saveError) {
      setVisible(section.is_visible);
      setError(saveError instanceof Error ? saveError.message : "Unable to update visibility.");
    } finally {
      setSavingKey(null);
    }
  };

  const handleSaveSection = async (section: PageSection) => {
    setSavingKey(section.section_key);
    setError(null);
    setMessage(null);
    try {
      const saved = await updateSection(page, section.section_key, {
        content: section.content,
        is_visible: section.is_visible,
      });
      setSections((current) =>
        current.map((item) => (item.section_key === saved.section_key ? saved : item)),
      );
      setMessage(`Saved "${section.label}".`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save section.");
    } finally {
      setSavingKey(null);
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

  return (
    <main className="mx-auto mt-28 max-w-[1000px] px-4 pb-20">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="headline-gradient mb-2 font-text text-lg font-bold uppercase tracking-[0.08em]">
            Admin
          </p>
          <h1 className="font-heading text-4xl uppercase">Content Manager</h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            Reorder, show/hide, and edit sections on the marketing pages.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {PAGES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPage(option.value)}
              className={`rounded px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em] transition ${
                page === option.value
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              {option.label}
            </button>
          ))}
          <Link
            to={page === "home" ? "/" : "/about"}
            className="rounded border border-slate-300 px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            View page
          </Link>
        </div>
      </header>

      {error ? (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      ) : null}
      {message ? (
        <div className="mb-4 rounded border border-green-200 bg-green-50 p-4 text-green-700">
          {message}
        </div>
      ) : null}

      {orderDirty ? (
        <div className="mb-4 flex items-center justify-between rounded border border-amber-300 bg-amber-50 p-4 text-amber-800">
          <span className="text-sm font-semibold">You have unsaved order changes.</span>
          <button
            type="button"
            onClick={() => void handleSaveOrder()}
            disabled={savingOrder}
            className="rounded bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
          >
            {savingOrder ? "Saving…" : "Save order"}
          </button>
        </div>
      ) : null}

      {loading ? (
        <p>Loading content…</p>
      ) : (
        <div className="space-y-4">
          {sections.map((section, index) => {
            const fields = getSectionFields(section.section_key);
            const isOpen = expanded === section.section_key;
            return (
              <section
                key={section.id}
                className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                        aria-label="Move up"
                        className="px-2 text-slate-500 hover:text-slate-900 disabled:opacity-30 dark:hover:text-white"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={index === sections.length - 1}
                        aria-label="Move down"
                        className="px-2 text-slate-500 hover:text-slate-900 disabled:opacity-30 dark:hover:text-white"
                      >
                        ▼
                      </button>
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{section.label}</p>
                      <p className="text-xs uppercase tracking-[0.08em] text-slate-400">
                        {section.section_key}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={section.is_visible}
                        disabled={savingKey === section.section_key}
                        onChange={() => void toggleVisibility(section)}
                      />
                      Visible
                    </label>
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : section.section_key)}
                      className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {isOpen ? "Close" : "Edit"}
                    </button>
                  </div>
                </div>

                {isOpen ? (
                  <div className="space-y-4 border-t border-slate-200 p-4 dark:border-slate-700">
                    <ContentFieldsEditor
                      fields={fields}
                      content={section.content}
                      onChange={(next) => updateLocalContent(section.section_key, next)}
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => void handleSaveSection(section)}
                        disabled={savingKey === section.section_key}
                        className="rounded bg-emerald-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
                      >
                        {savingKey === section.section_key ? "Saving…" : "Save section"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
};

export default AdminContentPage;
