import pathwaysProficient from "../assets/images/bb_pathwaytoproficientreader.png";
import metacognitiveCurriculum from "../assets/images/bb_metacognitiv.png";
import beyondOrdeal from "../assets/images/bb_beyondordea.png";
import worksheetsEslTeaching from "../assets/images/bb_beyondworsheet.png";
import reflectiveTeacher from "../assets/images/bb_thereflectiveteacherinclassroo.png";
import beyondOrdealAlt from "../assets/images/BeyondOrdeal_2.png";
import kaleidoscopeOne from "../assets/images/Kaleidoscope_1.png";
import kaleidoscopeTwo from "../assets/images/Kaleidoscope_2.png";
import beyondOrdealCover from "../assets/images/book_BeyondTheOrdeal.jpg";
import bookGreen from "../assets/images/book_green.png";
import metacognitiveAlt from "../assets/images/book_metacognittive.jpg";
import metacognitiveAltTwo from "../assets/images/bbb_metacognitive.png";
import bookRed from "../assets/images/book_red.png";
import bookPurple from "../assets/images/book_purple.png";

export const bookCoverBySlug: Record<string, string> = {
  "pathways-to-proficient-readers": pathwaysProficient,
  "beyond-worksheets-in-esl-teaching": worksheetsEslTeaching,
  "metacognitive-strategy-use-and-curriculum-design": metacognitiveCurriculum,
  "beyond-the-ordeal-book-of-poems": beyondOrdeal,
  "the-reflective-teacher-in-the-classroom": reflectiveTeacher,
  "tome-of-knowledge": bookGreen,
  "tome-of-wisdom": bookPurple,
};

export const bookGalleryBySlug: Record<string, string[]> = {
  "beyond-the-ordeal-book-of-poems": [beyondOrdealCover, beyondOrdealAlt],
  "metacognitive-strategy-use-and-curriculum-design": [
    metacognitiveAlt,
    metacognitiveAltTwo,
  ],
  "beyond-worksheets-in-esl-teaching": [kaleidoscopeOne, kaleidoscopeTwo],
  "tome-of-knowledge": [bookGreen],
  "tome-of-wisdom": [bookRed],
};

export const resolveBookImage = (slug?: string, fallback?: string) => {
  if (slug && bookCoverBySlug[slug]) return bookCoverBySlug[slug];
  return fallback || "";
};
