"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import { Comment } from "@/lib/types";
import { Avatar } from "./Avatar";
import { Button } from "./ui/Button";
import { Textarea } from "./ui/Field";
import { Spinner } from "./states";
import { relativeTime } from "@/lib/format";

export function CommentSection({ blogId }: { blogId: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ comments: Comment[] }>(`/blogs/${blogId}/comments?limit=50`);
      setComments(res.comments ?? []);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [blogId]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || posting) return;
    setPosting(true);
    setError("");
    try {
      const res = await api<{ comment: Comment }>(`/blogs/${blogId}/comments`, {
        method: "POST",
        body: { text: text.trim() },
      });
      setComments((c) => [res.comment, ...c]);
      setText("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not post comment.");
    } finally {
      setPosting(false);
    }
  }

  async function saveEdit(id: string) {
    if (!editText.trim()) return;
    try {
      const res = await api<{ comment: Comment }>(`/blogs/${blogId}/comments/${id}`, {
        method: "PUT",
        body: { text: editText.trim() },
      });
      setComments((cs) => cs.map((c) => (c._id === id ? { ...c, ...res.comment } : c)));
      setEditingId(null);
    } catch {
      /* keep editing on failure */
    }
  }

  async function remove(id: string) {
    const prev = comments;
    setComments((cs) => cs.filter((c) => c._id !== id));
    try {
      await api(`/blogs/${blogId}/comments/${id}`, { method: "DELETE" });
    } catch {
      setComments(prev);
    }
  }

  return (
    <section className="mt-14">
      <h2 className="mb-6 text-xl font-semibold">
        {loading ? "Comments" : `${comments.length} comment${comments.length === 1 ? "" : "s"}`}
      </h2>

      {user ? (
        <form onSubmit={submit} className="mb-8">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your thoughts…"
            rows={3}
            aria-label="Write a comment"
          />
          {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
          <div className="mt-2 flex justify-end">
            <Button type="submit" size="sm" loading={posting} disabled={!text.trim()}>
              Post comment
            </Button>
          </div>
        </form>
      ) : (
        <p className="mb-8 rounded-lg border border-border bg-subtle px-4 py-3 text-sm text-muted">
          <Link href="/login" className="font-medium text-accent hover:underline">
            Log in
          </Link>{" "}
          to join the conversation.
        </p>
      )}

      {loading ? (
        <Spinner />
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted">No comments yet. Be the first.</p>
      ) : (
        <ul className="flex flex-col gap-6">
          {comments.map((c) => {
            const mine = !!user && c.user?._id === user._id;
            return (
              <li key={c._id} className="flex gap-3">
                <Avatar name={c.user?.name} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-fg">{c.user?.name ?? "Unknown"}</span>
                    <span className="text-muted">{relativeTime(c.createdAt)}</span>
                    {c.editedAt && <span className="text-xs text-muted">(edited)</span>}
                  </div>

                  {editingId === c._id ? (
                    <div className="mt-2">
                      <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={2} />
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(c._id)}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap text-fg/90">{c.text}</p>
                  )}

                  {mine && editingId !== c._id && (
                    <div className="mt-1.5 flex gap-3 text-xs text-muted">
                      <button
                        className="hover:text-fg"
                        onClick={() => {
                          setEditingId(c._id);
                          setEditText(c.text);
                        }}
                      >
                        Edit
                      </button>
                      <button className="hover:text-red-500" onClick={() => remove(c._id)}>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
