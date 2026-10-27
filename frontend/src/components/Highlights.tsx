"use client";

import { RefObject, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import { HIGHLIGHT_BLOCKS, clearHighlightMarks, markPassage, normalizeText } from "@/lib/highlights";

interface Mine {
  _id: string;
  text: string;
}
interface HighlightsResponse {
  mine: Mine[];
  top: { text: string; count: number } | null;
}

type Popover =
  | { kind: "add"; text: string; x: number; y: number }
  | { kind: "remove"; id: string; x: number; y: number };

const MAX_LENGTH = 500;

/**
 * Highlights on a rendered post: marks the reader's own passages and the
 * post's top highlight, offers "Highlight" when the reader selects text
 * within one paragraph, and "Remove highlight" when they click one of theirs.
 * `html` is the rendered content, so marks are reapplied when it changes.
 */
export function Highlights({
  contentRef,
  blogId,
  html,
  canHighlight,
}: {
  contentRef: RefObject<HTMLDivElement>;
  blogId: string;
  html: string;
  canHighlight: boolean;
}) {
  const { user } = useAuth();
  const [data, setData] = useState<HighlightsResponse>({ mine: [], top: null });
  const [popover, setPopover] = useState<Popover | null>(null);
  const [error, setError] = useState("");
  const enabled = canHighlight && !!user;

  useEffect(() => {
    let cancelled = false;
    api<HighlightsResponse>(`/blogs/${blogId}/highlights`)
      .then((res) => !cancelled && setData(res))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [blogId, user]);

  // Reapply marks whenever the highlights or the content change.
  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    clearHighlightMarks(root);
    const mineTexts = new Set(data.mine.map((h) => h.text));
    if (data.top && !mineTexts.has(data.top.text)) {
      markPassage(root, data.top.text, {
        "data-hl": "top",
        title: `Top highlight · ${data.top.count} readers`,
      });
    }
    for (const h of data.mine) {
      markPassage(root, h.text, { "data-hl": "mine", "data-hl-id": h._id, title: "Your highlight — click to remove" });
    }
  }, [data, html, contentRef]);

  // Offer to highlight a fresh selection inside one block of the post.
  const onSelectionEnd = useCallback(() => {
    if (!enabled) return;
    const root = contentRef.current;
    const sel = window.getSelection();
    if (!root || !sel || sel.isCollapsed || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) return;
    const blockOf = (n: Node) => (n.nodeType === 1 ? (n as Element) : n.parentElement)?.closest(HIGHLIGHT_BLOCKS);
    const startBlock = blockOf(range.startContainer);
    if (!startBlock || startBlock !== blockOf(range.endContainer)) return;
    const text = normalizeText(sel.toString());
    if (!text || text.length > MAX_LENGTH) return;
    const rect = range.getBoundingClientRect();
    setError("");
    setPopover({ kind: "add", text, x: rect.left + rect.width / 2, y: rect.top });
  }, [enabled, contentRef]);

  useEffect(() => {
    if (!enabled) return;
    const root = contentRef.current;
    if (!root) return;
    function onUp() {
      // Let the selection settle before reading it.
      window.setTimeout(onSelectionEnd, 0);
    }
    function onClick(e: MouseEvent) {
      const mark = (e.target as Element).closest?.('mark[data-hl="mine"]');
      if (!mark || !window.getSelection()?.isCollapsed) return;
      const rect = mark.getBoundingClientRect();
      setPopover({ kind: "remove", id: mark.getAttribute("data-hl-id") ?? "", x: rect.left + rect.width / 2, y: rect.top });
    }
    root.addEventListener("mouseup", onUp);
    root.addEventListener("keyup", onUp);
    root.addEventListener("click", onClick);
    return () => {
      root.removeEventListener("mouseup", onUp);
      root.removeEventListener("keyup", onUp);
      root.removeEventListener("click", onClick);
    };
  }, [enabled, contentRef, onSelectionEnd]);

  // Dismiss on scroll, Escape, or a click elsewhere.
  useEffect(() => {
    if (!popover) return;
    const close = () => setPopover(null);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    function onDown(e: MouseEvent) {
      if (!(e.target as Element).closest?.("[data-hl-popover]")) close();
    }
    window.addEventListener("scroll", close, { passive: true });
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("scroll", close);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [popover]);

  async function add(text: string) {
    try {
      const res = await api<{ highlight: Mine }>(`/blogs/${blogId}/highlights`, { method: "POST", body: { text } });
      setData((d) => ({ ...d, mine: d.mine.some((h) => h._id === res.highlight._id) ? d.mine : [...d.mine, res.highlight] }));
      window.getSelection()?.removeAllRanges();
      setPopover(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save that highlight.");
    }
  }

  async function remove(id: string) {
    try {
      await api(`/blogs/${blogId}/highlights/${id}`, { method: "DELETE" });
      setData((d) => ({ ...d, mine: d.mine.filter((h) => h._id !== id) }));
      setPopover(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't remove that highlight.");
    }
  }

  if (!popover) return null;
  return (
    <div
      data-hl-popover
      className="fixed z-40 -translate-x-1/2 -translate-y-full pb-2"
      style={{ left: popover.x, top: popover.y }}
    >
      <div className="flex flex-col items-center rounded-lg border border-border bg-card px-1 py-1 shadow-xl">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()} // keep the selection
          onClick={() => (popover.kind === "add" ? add(popover.text) : remove(popover.id))}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-fg hover:bg-subtle"
        >
          {popover.kind === "add" ? "Highlight" : "Remove highlight"}
        </button>
        {error && <p className="max-w-[14rem] px-2 pb-1 text-center text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}
