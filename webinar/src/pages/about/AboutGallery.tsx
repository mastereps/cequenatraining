import InternationalPhoto from "../../assets/images/001_international.png";
import GroupPhoto from "../../assets/images/002_group.png";
import InternationalEventPhoto from "../../assets/images/006_ggroup.png";
import type { SectionContent } from "../../features/content/types";
import { pickList } from "../../features/content/helpers";

// Fallback images and their original framing (object-position) per slot.
const DEFAULT_IMAGES = [GroupPhoto, InternationalPhoto, InternationalEventPhoto];
const ALT_TEXT = [
  "Maria Cequena with fellow educators",
  "Maria Cequena at an international event",
  "Maria Cequena during a professional engagement",
];
const OBJECT_POSITION = ["object-center", "object-[60%_20%]", "object-[50%_50%]"];

const AboutGallery = ({ content }: { content?: SectionContent }) => {
  const images = pickList<string>(content, "images", DEFAULT_IMAGES);

  return (
    <div className="mt-20 grid gap-5 md:grid-cols-3">
      {images.slice(0, 3).map((image, index) => (
        <div
          key={index}
          className="overflow-hidden border border-slate-200 shadow-sm dark:border-white/10 dark:shadow-none"
        >
          <img
            src={image && image.trim() !== "" ? image : DEFAULT_IMAGES[index]}
            alt={ALT_TEXT[index] || "Maria Cequena"}
            className={`h-[220px] w-full object-cover ${OBJECT_POSITION[index] || "object-center"}`}
          />
        </div>
      ))}
    </div>
  );
};

export default AboutGallery;
