"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

type Target = "copy" | "x" | "linkedin" | "native";

const itemClass =
  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-fg transition-colors hover:bg-subtle";

export function ShareButton({ blogId, title }: { blogId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // navigator.share only exists in the browser (and mostly on mobile), so
  // check after mount rather than during render.
  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  // Close on Escape and on clicks outside, returning focus to the toggle.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || toggleRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  // The canonical URL, without any query string or fragment the reader
  // happened to land on.
  function url() {
    return `${window.location.origin}${window.location.pathname}`;
  }

  function record() {
    // Fire-and-forget: a failed count must never get in the way of sharing.
    api(`/blogs/${blogId}/share`, { method: "POST", body: {} }).catch(() => {});
  }

  async function share(target: Target) {
    const link = url();
    if (target === "copy") {
      try {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        return; // clipboard blocked — nothing was shared
      }
    } else if (target === "native") {
      try {
        await navigator.share({ title, url: link });
      } catch {
        return; // dismissed
      }
    } else {
      const href =
        target === "x"
          ? `https://twitter.com/intent/tweet?url=${encodeURIComponent(link)}&text=${encodeURIComponent(title)}`
          : `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`;
      window.open(href, "_blank", "noopener,noreferrer,width=600,height=600");
    }
    record();
    if (target !== "copy") setOpen(false);
  }

  return (
    <div className="relative">
      <button
        ref={toggleRef}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Share"
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-subtle"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
          <path d="m16 6-4-4-4 4" />
          <path d="M12 2v13" />
        </svg>
        <span className="hidden sm:inline">Share</span>
      </button>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          className="absolute bottom-full left-1/2 z-20 mb-2 w-52 -translate-x-1/2 rounded-xl border border-border bg-card p-1 shadow-xl"
        >
          <button role="menuitem" className={itemClass} onClick={() => share("copy")}>
            {copied ? "Link copied" : "Copy link"}
          </button>
          <button role="menuitem" className={itemClass} onClick={() => share("x")}>
            Share on X
          </button>
          <button role="menuitem" className={itemClass} onClick={() => share("linkedin")}>
            Share on LinkedIn
          </button>
          {canNativeShare && (
            <button role="menuitem" className={itemClass} onClick={() => share("native")}>
              More options…
            </button>
          )}
        </div>
      )}
    </div>
  );
}
