import { initials } from "@/lib/format";

// Deterministic accent-neutral background per name.
const palette = [
  "bg-teal-600",
  "bg-indigo-600",
  "bg-rose-600",
  "bg-amber-600",
  "bg-emerald-600",
  "bg-sky-600",
  "bg-fuchsia-600",
];

function hueFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % palette.length;
  return palette[h];
}

export function Avatar({ name, size = 36 }: { name?: string; size?: number }) {
  const label = name || "Unknown";
  return (
    <span
      className={`inline-grid flex-none place-items-center rounded-full font-semibold text-white ${hueFor(label)}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {initials(label)}
    </span>
  );
}
