import { useState } from "react";
import { uploadContentImage } from "../../features/content/api";
import type { ContentField, LeafField, LeafType } from "../../features/content/fieldSchemas";
import type { SectionContent } from "../../features/content/types";

const inputClass =
  "w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800";
const labelClass = "mb-1 block text-sm font-semibold";

// ---- Image field with upload ------------------------------------------------

const ImageField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadContentImage(file);
      onChange(url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex flex-wrap items-center gap-3">
        {value ? (
          <img
            src={value}
            alt={label}
            className="h-16 w-16 rounded border border-slate-200 object-cover dark:border-slate-700"
          />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded border border-dashed border-slate-300 text-[10px] uppercase text-slate-400 dark:border-slate-600">
            None
          </span>
        )}
        <div className="flex flex-col gap-2">
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(event) => void handleFile(event.target.files?.[0])}
            className="text-sm"
          />
          {value ? (
            <button
              type="button"
              onClick={() => onChange("")}
              className="self-start text-xs font-semibold uppercase tracking-[0.08em] text-rose-600 hover:underline"
            >
              Remove image
            </button>
          ) : null}
        </div>
      </div>
      {uploading ? <p className="mt-1 text-xs text-slate-500">Uploading…</p> : null}
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
};

// ---- Leaf field -------------------------------------------------------------

const LeafInput = ({
  type,
  label,
  value,
  onChange,
}: {
  type: LeafType;
  label: string;
  value: unknown;
  onChange: (next: unknown) => void;
}) => {
  if (type === "boolean") {
    return (
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
        {label}
      </label>
    );
  }

  if (type === "image") {
    return (
      <ImageField
        label={label}
        value={typeof value === "string" ? value : ""}
        onChange={(next) => onChange(next)}
      />
    );
  }

  if (type === "textarea") {
    return (
      <div>
        <label className={labelClass}>{label}</label>
        <textarea
          rows={3}
          className={inputClass}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    );
  }

  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        type="text"
        className={inputClass}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
};

// ---- String list ------------------------------------------------------------

const StringListField = ({
  field,
  value,
  onChange,
}: {
  field: Extract<ContentField, { type: "stringList" }>;
  value: string[];
  onChange: (next: string[]) => void;
}) => {
  const setItem = (index: number, next: unknown) => {
    const copy = [...value];
    copy[index] = typeof next === "string" ? next : "";
    onChange(copy);
  };

  return (
    <div>
      <p className={labelClass}>{field.label}</p>
      <div className="space-y-3 rounded border border-slate-200 p-3 dark:border-slate-700">
        {value.map((item, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className="flex-1">
              <LeafInput
                type={field.itemType}
                label={`${field.itemLabel || "Item"} ${index + 1}`}
                value={item}
                onChange={(next) => setItem(index, next)}
              />
            </div>
            <button
              type="button"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              className="mt-6 text-xs font-semibold uppercase text-rose-600 hover:underline"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...value, ""])}
          className="text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
        >
          + Add {field.itemLabel || "item"}
        </button>
      </div>
    </div>
  );
};

// ---- Object list ------------------------------------------------------------

const ObjectListField = ({
  field,
  value,
  onChange,
}: {
  field: Extract<ContentField, { type: "objectList" }>;
  value: Record<string, unknown>[];
  onChange: (next: Record<string, unknown>[]) => void;
}) => {
  const setItemField = (index: number, key: string, next: unknown) => {
    const copy = value.map((item) => ({ ...item }));
    copy[index] = { ...copy[index], [key]: next };
    onChange(copy);
  };

  const emptyItem = () => {
    const item: Record<string, unknown> = {};
    field.fields.forEach((leaf: LeafField) => {
      item[leaf.key] = leaf.type === "boolean" ? false : "";
    });
    return item;
  };

  return (
    <div>
      <p className={labelClass}>{field.label}</p>
      <div className="space-y-4">
        {value.map((item, index) => (
          <div
            key={index}
            className="space-y-3 rounded border border-slate-200 p-3 dark:border-slate-700"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                {field.itemLabel || "Item"} {index + 1}
              </span>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                className="text-xs font-semibold uppercase text-rose-600 hover:underline"
              >
                Remove
              </button>
            </div>
            {field.fields.map((leaf) => (
              <LeafInput
                key={leaf.key}
                type={leaf.type}
                label={leaf.label}
                value={item[leaf.key]}
                onChange={(next) => setItemField(index, leaf.key, next)}
              />
            ))}
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...value, emptyItem()])}
          className="text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
        >
          + Add {field.itemLabel || "item"}
        </button>
      </div>
    </div>
  );
};

// ---- Editor -----------------------------------------------------------------

const ContentFieldsEditor = ({
  fields,
  content,
  onChange,
}: {
  fields: ContentField[];
  content: SectionContent;
  onChange: (next: SectionContent) => void;
}) => {
  if (fields.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        This section has no editable text — use reorder and show/hide only.
      </p>
    );
  }

  const setField = (key: string, value: unknown) => {
    onChange({ ...content, [key]: value });
  };

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        if (field.type === "stringList") {
          const value = Array.isArray(content[field.key]) ? (content[field.key] as string[]) : [];
          return (
            <StringListField
              key={field.key}
              field={field}
              value={value}
              onChange={(next) => setField(field.key, next)}
            />
          );
        }
        if (field.type === "objectList") {
          const value = Array.isArray(content[field.key])
            ? (content[field.key] as Record<string, unknown>[])
            : [];
          return (
            <ObjectListField
              key={field.key}
              field={field}
              value={value}
              onChange={(next) => setField(field.key, next)}
            />
          );
        }
        return (
          <LeafInput
            key={field.key}
            type={field.type}
            label={field.label}
            value={content[field.key]}
            onChange={(next) => setField(field.key, next)}
          />
        );
      })}
    </div>
  );
};

export default ContentFieldsEditor;
