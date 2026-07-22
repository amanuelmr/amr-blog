import Image from "next/image";

// Deterministic gradient fallback when a post has no cover image.
const gradients = [
  "from-teal-500/25 to-indigo-500/25",
  "from-rose-500/25 to-amber-500/25",
  "from-sky-500/25 to-emerald-500/25",
  "from-fuchsia-500/25 to-cyan-500/25",
  "from-amber-500/25 to-rose-500/25",
];

function pick(seed: string) {
  let n = 0;
  for (let i = 0; i < seed.length; i++) n = (n + seed.charCodeAt(i)) % gradients.length;
  return gradients[n];
}

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
  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${pick(title)}`}
      aria-hidden="true"
    >
      <span className="select-none font-serif text-5xl font-bold text-fg/25">
        {title.trim()[0]?.toUpperCase() ?? "A"}
      </span>
    </div>
  );
}
