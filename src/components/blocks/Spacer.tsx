const SIZES = {
  small: "h-8",
  medium: "h-16",
  large: "h-28",
} as const;

// A generic vertical spacer with an optional centred divider line. Purely
// presentational (aria-hidden), used to add breathing room or a visual break
// between blocks when redesigning a page.
export default function Spacer({
  size = "medium",
  divider = false,
}: {
  size?: "small" | "medium" | "large";
  divider?: boolean;
}) {
  const heightClass = SIZES[size] ?? SIZES.medium;
  return (
    <div
      className={`@container flex w-full items-center bg-white px-6 sm:px-12 @5xl:px-45 ${heightClass}`}
      aria-hidden="true"
    >
      {divider && <hr className="w-full border-t border-[#0c0c48]/15" />}
    </div>
  );
}
