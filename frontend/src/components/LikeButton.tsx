"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Blog } from "@/lib/types";

export function LikeButton({
  blogId,
  initialLikes,
}: {
  blogId: string;
  initialLikes: string[];
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [likes, setLikes] = useState(initialLikes);
  const [busy, setBusy] = useState(false);

  const liked = !!user && likes.includes(user._id);

  async function toggle() {
    if (!user) {
      router.push("/login");
      return;
    }
    if (busy) return;
    setBusy(true);
    // optimistic
    const prev = likes;
    setLikes(liked ? likes.filter((id) => id !== user._id) : [...likes, user._id]);
    try {
      const blog = await api<Blog>(`/blogs/${blogId}/like`, { method: "POST", body: {} });
      setLikes(blog.likes ?? []);
    } catch {
      setLikes(prev); // revert on failure
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-pressed={liked}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        liked
          ? "border-accent bg-accent/10 text-accent"
          : "border-border bg-card text-fg hover:bg-subtle"
      }`}
    >
      <svg
        width="16" height="16" viewBox="0 0 24 24"
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
      <span className="tabular-nums">{likes.length}</span>
    </button>
  );
}
