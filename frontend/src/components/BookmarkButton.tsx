"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

export function BookmarkButton({ blogId, initialBookmarked }: { blogId: string; initialBookmarked: boolean }) {
  const { user } = useAuth();
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!user) {
      router.push("/login");
      return;
    }
    if (busy) return;
    setBusy(true);
    const prev = bookmarked;
    setBookmarked(!prev); // optimistic
    try {
      const res = await api<{ bookmarked: boolean }>(`/blogs/${blogId}/bookmark`, { method: "POST", body: {} });
      setBookmarked(res.bookmarked);
    } catch {
      setBookmarked(prev); // revert on failure
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-pressed={bookmarked}
      title={bookmarked ? "Remove from reading list" : "Save to reading list"}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        bookmarked
          ? "border-accent bg-accent/10 text-accent"
          : "border-border bg-card text-fg hover:bg-subtle"
      }`}
    >
      <svg
        width="16" height="16" viewBox="0 0 24 24"
        fill={bookmarked ? "currentColor" : "none"}
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M19 21 12 16.5 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
      <span className="hidden sm:inline">{bookmarked ? "Saved" : "Save"}</span>
    </button>
  );
}
