import Image from "next/image";
import { getSafeHttpUrl } from "@/lib/safe-url";

export type DirectorCardProps = {
  name: string;
  title: string;
  photoPath: string;
  profileUrl?: string | null;
};

export default function DirectorCard({
  name,
  title,
  photoPath,
  profileUrl,
}: DirectorCardProps) {
  const href = getSafeHttpUrl(profileUrl);
  const isClickable = Boolean(href);

  const baseClass =
    "flex flex-col items-center bg-white rounded-[20px] px-5 pt-8 pb-6 sm:px-8 sm:pt-10 sm:pb-8 flex-1 min-w-0";
  const clickableClass =
    "no-underline text-inherit cursor-pointer transition-all duration-200 shadow-[0_0_20px_rgba(0,0,0,0.25)] hover:-translate-y-1 hover:outline hover:outline-2 hover:outline-[#0c0c48] hover:outline-offset-[6px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0c0c48] focus-visible:ring-offset-2";
  const staticClass = "shadow-[0_0_20px_rgba(0,0,0,0.25)]";

  const inner = (
    <>
      <div className="w-[160px] h-[160px] sm:w-[250px] sm:h-[250px] rounded-full overflow-hidden flex-shrink-0 mb-5 sm:mb-7">
        <Image
          src={photoPath}
          alt={name}
          width={250}
          height={250}
          className="w-full h-full object-cover"
        />
      </div>

      <p
        className={`text-[16px] sm:text-[20px] font-bold text-[#0c0c48] text-center mb-1.5 ${
          isClickable ? "group-hover:underline" : ""
        }`}
      >
        {name}
      </p>

      <p className="text-[13px] sm:text-[16px] text-[#4b5563] text-center">{title}</p>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${name} — open profile in a new tab`}
        className={`group ${baseClass} ${clickableClass}`}
      >
        {inner}
      </a>
    );
  }

  return <div className={`${baseClass} ${staticClass}`}>{inner}</div>;
}