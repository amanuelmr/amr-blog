import Image from "next/image";

export function CoverImage({
  src,
  title,
  priority,
  sizes = "(max-width: 768px) 100vw, 400px",
}: {
  src?: string | null;
  title: string;
  priority?: boolean;
  sizes?: string;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt={title}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    );
  }
  // Refined neutral fallback — a quiet typographic mark, no candy gradients.
  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden bg-subtle"
      aria-hidden="true"
    >
      <span className="select-none font-serif text-6xl font-bold text-fg/[0.08]">
        {title.trim()[0]?.toUpperCase() ?? "A"}
      </span>
      <span className="absolute inset-0 bg-gradient-to-br from-fg/[0.015] to-transparent" />
    </div>
  );
}
