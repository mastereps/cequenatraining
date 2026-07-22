import aiPlaceholder from "../../assets/images/webinar-placeholders/ai_bg_placeholder.webp";
import libraPlaceholder from "../../assets/images/webinar-placeholders/libra_bg_placeholder.webp";
import openPlaceholder from "../../assets/images/webinar-placeholders/open_bg_placeholder.webp";

/**
 * Default hero image used on a webinar card when no poster has been uploaded.
 * AI topics get the AI background; everything else alternates between the two
 * literacy/general backgrounds by a stable hash of `seed` so adjacent cards
 * differ while a given webinar always shows the same image.
 */
export const getWebinarPlaceholder = (topic: string, seed = ""): string => {
  if (topic?.toLowerCase().includes("ai")) return aiPlaceholder;
  const hash = seed
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return hash % 2 === 0 ? openPlaceholder : libraPlaceholder;
};
