export interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

/**
 * Assign stable anchor ids to h2/h3 elements in already-sanitized article
 * HTML and return the updated markup alongside a flat heading list, so a
 * table of contents can link into the rendered article.
 */
export function withHeadingAnchors(html: string): { html: string; headings: Heading[] } {
  if (typeof window === "undefined" || !html) return { html, headings: [] };

  const doc = new DOMParser().parseFromString(html, "text/html");
  const nodes = Array.from(doc.body.querySelectorAll("h2, h3"));
  if (nodes.length === 0) return { html, headings: [] };

  const seen = new Map<string, number>();
  const headings: Heading[] = nodes.map((node) => {
    const text = node.textContent?.trim() || "";
    const base =
      text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "section";
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    const id = count ? `${base}-${count}` : base;
    node.id = id;
    return { id, text, level: node.tagName === "H2" ? 2 : 3 };
  });

  return { html: doc.body.innerHTML, headings };
}
