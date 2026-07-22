export function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function relativeTime(iso?: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

/** Strip HTML tags and decode a few common entities to plain text. */
export function stripHtml(html: string): string {
  return (html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalize stored content to HTML for rendering. New posts are already HTML
 * (from the editor, sanitized server-side); legacy posts are plain text with
 * newlines — wrap those into paragraphs so they render correctly.
 */
export function contentToHtml(content: string): string {
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(content || "");
  if (looksLikeHtml) return content;
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return (content || "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** Estimated reading time (~200 wpm), HTML-safe. */
export function readingTime(content: string): number {
  const words = stripHtml(content).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function initials(name?: string): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Deterministic plain-text excerpt from (possibly HTML) content. */
export function excerpt(content: string, max = 160): string {
  const clean = stripHtml(content);
  if (clean.length <= max) return clean;
  return clean.slice(0, max).replace(/\s+\S*$/, "") + "…";
}
