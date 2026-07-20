import type { SectionContent } from "./types";

/** Read a string field, falling back to a default when missing/empty. */
export const pickString = (
  content: SectionContent | undefined,
  key: string,
  fallback: string,
): string => {
  const value = content?.[key];
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
};

/** Read a boolean field with a default. */
export const pickBool = (
  content: SectionContent | undefined,
  key: string,
  fallback = false,
): boolean => {
  const value = content?.[key];
  return typeof value === "boolean" ? value : fallback;
};

/** Read an array field, falling back to a default when missing/empty. */
export const pickList = <T>(
  content: SectionContent | undefined,
  key: string,
  fallback: T[],
): T[] => {
  const value = content?.[key];
  return Array.isArray(value) && value.length > 0 ? (value as T[]) : fallback;
};
