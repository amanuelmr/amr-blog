// Finding a highlighted passage in a rendered post and marking it.
//
// Highlights are stored as their whitespace-normalized text. To show one, we
// search each block of the post (paragraph, list item, heading…) for that
// text across its inline markup, then wrap the matching run of every text
// node it spans in a <mark>. Passages never cross blocks: the selection UI
// only offers to highlight within one.

export const HIGHLIGHT_BLOCKS = "p, li, blockquote, h1, h2, h3, h4, figcaption, pre";

export const normalizeText = (s: string) => s.replace(/\s+/g, " ").trim();

/** Remove every highlight mark, restoring the original text nodes. */
export function clearHighlightMarks(root: HTMLElement) {
  root.querySelectorAll("mark[data-hl]").forEach((m) => {
    const parent = m.parentNode;
    if (!parent) return;
    while (m.firstChild) parent.insertBefore(m.firstChild, m);
    parent.removeChild(m);
    parent.normalize();
  });
}

interface Point {
  node: Text;
  offset: number;
}

/** Text of one block with whitespace collapsed, and where each character came from. */
function indexBlock(block: Element) {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let text = "";
  const points: Point[] = [];
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const value = node.nodeValue ?? "";
    for (let i = 0; i < value.length; i++) {
      if (/\s/.test(value[i])) {
        if (text === "" || text.endsWith(" ")) continue;
        text += " ";
      } else {
        text += value[i];
      }
      points.push({ node, offset: i });
    }
  }
  return { text, points };
}

/**
 * Mark the first occurrence of `passage` in `root`. Returns whether it was
 * found. `attrs` go on every <mark> (a passage spanning inline markup is
 * wrapped in several).
 */
export function markPassage(root: HTMLElement, passage: string, attrs: Record<string, string>): boolean {
  const target = normalizeText(passage);
  if (!target) return false;

  // Innermost blocks only (a list item wraps its own paragraph).
  const blocks = Array.from(root.querySelectorAll(HIGHLIGHT_BLOCKS)).filter((b) => !b.querySelector(HIGHLIGHT_BLOCKS));
  for (const block of blocks) {
    const { text, points } = indexBlock(block);
    const at = text.indexOf(target);
    if (at === -1) continue;

    const start = points[at];
    const end = points[at + target.length - 1];
    // Collect each text node's [from, to) run, then wrap from last to first
    // so splitting one node never shifts the offsets of another.
    const runs: { node: Text; from: number; to: number }[] = [];
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    let inside = false;
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      if (node === start.node) inside = true;
      if (!inside) continue;
      const from = node === start.node ? start.offset : 0;
      const to = node === end.node ? end.offset + 1 : (node.nodeValue ?? "").length;
      if (to > from) runs.push({ node, from, to });
      if (node === end.node) break;
    }
    for (const { node, from, to } of runs.reverse()) {
      const range = document.createRange();
      range.setStart(node, from);
      range.setEnd(node, to);
      const mark = document.createElement("mark");
      for (const [k, v] of Object.entries(attrs)) mark.setAttribute(k, v);
      range.surroundContents(mark);
    }
    return true;
  }
  return false;
}
