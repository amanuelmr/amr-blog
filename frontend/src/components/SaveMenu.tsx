"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import { ReadingListSummary } from "@/lib/types";

const itemClass =
  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-fg transition-colors hover:bg-subtle";

function Check({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`grid h-4 w-4 flex-none place-items-center rounded border ${on ? "border-accent bg-accent text-accent-fg" : "border-border"}`}
    >
      {on && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
    </span>
  );
}

/**
 * Save a post to the reading list and/or any of the reader's named lists,
 * or start a new list with it. The lists load when the menu opens.
 */
export function SaveMenu({ blogId, initialBookmarked }: { blogId: string; initialBookmarked: boolean }) {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [lists, setLists] = useState<ReadingListSummary[] | null>(null);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const savedAnywhere = bookmarked || !!lists?.some((l) => l.contains);

  useEffect(() => {
    if (!open) return;
    setError("");
    api<{ lists: ReadingListSummary[] }>(`/lists/mine?blog=${blogId}`)
      .then((res) => setLists(res.lists))
      .catch(() => setError("Couldn't load your lists."));
  }, [open, blogId]);

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

  function onToggleMenu() {
    if (!user) {
      router.push("/login");
      return;
    }
    setOpen((o) => !o);
  }

  async function toggleBookmark() {
    const prev = bookmarked;
    setBookmarked(!prev);
    try {
      const res = await api<{ bookmarked: boolean }>(`/blogs/${blogId}/bookmark`, { method: "POST", body: {} });
      setBookmarked(res.bookmarked);
    } catch {
      setBookmarked(prev);
    }
  }

  async function toggleList(list: ReadingListSummary) {
    const flip = (l: ReadingListSummary, contains: boolean, itemCount: number) =>
      l._id === list._id ? { ...l, contains, itemCount } : l;
    setLists((ls) => ls && ls.map((l) => flip(l, !list.contains, l.itemCount)));
    try {
      const res = await api<{ saved: boolean; itemCount: number }>(`/lists/${list._id}/items`, {
        method: "POST",
        body: { blogId },
      });
      setLists((ls) => ls && ls.map((l) => flip(l, res.saved, res.itemCount)));
    } catch (err) {
      setLists((ls) => ls && ls.map((l) => (l._id === list._id ? list : l)));
      setError(err instanceof ApiError ? err.message : "Couldn't update that list.");
    }
  }

  async function createList(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setError("");
    try {
      const { list } = await api<{ list: ReadingListSummary }>("/lists", { method: "POST", body: { name } });
      setNewName("");
      setLists((ls) => [{ ...list, contains: false }, ...(ls ?? [])]);
      await toggleList({ ...list, contains: false });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create the list.");
    }
  }

  return (
    <div className="relative">
      <button
        ref={toggleRef}
        onClick={onToggleMenu}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Save to a list"
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
          savedAnywhere ? "border-accent bg-accent/10 text-accent" : "border-border bg-card text-fg hover:bg-subtle"
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={savedAnywhere ? "currentColor" : "none"} stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 21 12 16.5 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
        <span className="hidden sm:inline">{savedAnywhere ? "Saved" : "Save"}</span>
      </button>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          className="absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 rounded-xl border border-border bg-card p-1 shadow-xl"
        >
          <button role="menuitemcheckbox" aria-checked={bookmarked} className={itemClass} onClick={toggleBookmark}>
            <Check on={bookmarked} />
            Reading list
          </button>
          {lists === null && !error && <p className="px-3 py-2 text-xs text-muted">Loading your lists…</p>}
          {lists?.map((l) => (
            <button key={l._id} role="menuitemcheckbox" aria-checked={!!l.contains} className={itemClass} onClick={() => toggleList(l)}>
              <Check on={!!l.contains} />
              <span className="min-w-0 flex-1 truncate">{l.name}</span>
              {!l.isPublic && <span className="text-[0.6875rem] text-faint">Private</span>}
            </button>
          ))}
          <form onSubmit={createList} className="mt-1 flex items-center gap-1 border-t border-border p-1.5">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={60}
              placeholder="New list…"
              aria-label="New list name"
              className="min-w-0 flex-1 rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-fg focus:border-accent focus:outline-none"
            />
            <button type="submit" disabled={!newName.trim()} className="rounded-md px-2 py-1.5 text-sm font-medium text-accent disabled:opacity-40">
              Create
            </button>
          </form>
          {error && <p className="px-3 pb-2 text-xs text-red-500">{error}</p>}
        </div>
      )}
    </div>
  );
}
