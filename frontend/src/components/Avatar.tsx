import { initials } from "@/lib/format";

// A profile photo when there is one; otherwise a restrained monochrome
// initials avatar — quiet neutral, no candy colors. Decorative either way:
// the name always appears next to it.
export function Avatar({ name, src, size = 36 }: { name?: string; src?: string | null; size?: number }) {
  const label = name || "Unknown";
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- tiny, already-sized Cloudinary image
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className="flex-none rounded-full border border-border bg-subtle object-cover"
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
    );
  }
  return (
    <span
      className="inline-grid flex-none place-items-center rounded-full border border-border bg-subtle font-semibold uppercase text-muted"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden="true"
    >
      {initials(label)}
    </span>
  );
}
