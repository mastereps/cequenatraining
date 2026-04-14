const DEFAULT_REGISTRATION_QR_IMAGE_URL = "/images/google_qr_code_ai_teaching.png";

const REGISTRATION_QR_IMAGE_BY_SLUG: Record<string, string> = {
  "beyond-words-enhancing-comprehension-and-language-proficiency-with-a-four-pronged-approach":
    "/images/beyond_words_enhancing_qr.png",
  "teaching-literature-and-language-in-a-flipped-classroom":
    "/images/teaching_literature_and_language_qr.png",
};

export const getRegistrationQrImageUrl = (slug: string) =>
  REGISTRATION_QR_IMAGE_BY_SLUG[slug] || DEFAULT_REGISTRATION_QR_IMAGE_URL;
