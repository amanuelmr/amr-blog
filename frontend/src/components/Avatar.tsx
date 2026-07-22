import { initials } from "@/lib/format";

// Restrained monochrome avatar — quiet neutral, no candy colors.
export function Avatar({ name, size = 36 }: { name?: string; size?: number }) {
  const label = name || "Unknown";
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
