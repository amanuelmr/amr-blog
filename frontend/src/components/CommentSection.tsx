"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import { Comment } from "@/lib/types";
import { Avatar } from "./Avatar";
import { Button } from "./ui/Button";
import { Textarea } from "./ui/Field";
import { Spinner } from "./states";
import { relativeTime } from "@/lib/format";

// Replies are one level deep: group the flat list into top-level comments
// plus a parentId -> replies map, replies sorted oldest-first within a
// thread (top-level order is left as the server returned it — newest-first).
function groupByThread(comments: Comment[]) {
  const topLevel = comments.filter((c) => !c.parentComment);
  const repliesByParent = new Map<string, Comment[]>();
  for (const c of comments) {
    if (!c.parentComment) continue;
    const list = repliesByParent.get(c.parentComment) ?? [];
    list.push(c);
    repliesByParent.set(c.parentComment, list);
  }
  repliesByParent.forEach((list) =>
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  );
  return { topLevel, repliesByParent };
}

export function CommentSection({ blogId }: { blogId: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyError, setReplyError] = useState("");
  const [replying, setReplying] = useState(false);

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

  const { topLevel, repliesByParent } = useMemo(() => groupByThread(comments), [comments]);

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

  function startReply(topLevelId: string) {
    setReplyingTo(topLevelId);
    setReplyText("");
    setReplyError("");
  }

  async function submitReply(e: React.FormEvent, parentId: string) {
    e.preventDefault();
    if (!replyText.trim() || replying) return;
    setReplying(true);
    setReplyError("");
    try {
      const res = await api<{ comment: Comment }>(`/blogs/${blogId}/comments`, {
        method: "POST",
        body: { text: replyText.trim(), parentComment: parentId },
      });
      setComments((c) => [res.comment, ...c]);
      setReplyingTo(null);
      setReplyText("");
    } catch (err) {
      setReplyError(err instanceof ApiError ? err.message : "Could not post reply.");
    } finally {
      setReplying(false);
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
    // Deleting a top-level comment removes its replies too (server cascades).
    setComments((cs) => cs.filter((c) => c._id !== id && c.parentComment !== id));
    try {
      await api(`/blogs/${blogId}/comments/${id}`, { method: "DELETE" });
    } catch {
      setComments(prev);
    }
  }

  function CommentBody({ c, isReply }: { c: Comment; isReply: boolean }) {
    const mine = !!user && c.user?._id === user._id;
    return (
      <div className="flex gap-3">
        <Avatar name={c.user?.name} size={isReply ? 30 : 36} />
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

          {editingId !== c._id && (
            <div className="mt-1.5 flex gap-3 text-xs text-muted">
              {user && (
                <button className="hover:text-fg" onClick={() => startReply(isReply ? c.parentComment! : c._id)}>
                  Reply
                </button>
              )}
              {mine && (
                <>
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
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
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
      ) : topLevel.length === 0 ? (
        <p className="text-sm text-muted">No comments yet. Be the first.</p>
      ) : (
        <ul className="flex flex-col gap-6">
          {topLevel.map((c) => (
            <li key={c._id}>
              <CommentBody c={c} isReply={false} />

              {(repliesByParent.get(c._id) ?? []).length > 0 && (
                <ul className="ml-[3.375rem] mt-4 flex flex-col gap-4 border-l border-border pl-4">
                  {repliesByParent.get(c._id)!.map((r) => (
                    <li key={r._id}>
                      <CommentBody c={r} isReply />
                    </li>
                  ))}
                </ul>
              )}

              {replyingTo === c._id && (
                <form
                  onSubmit={(e) => submitReply(e, c._id)}
                  className="ml-[3.375rem] mt-4 border-l border-border pl-4"
                >
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Reply to ${c.user?.name ?? "this comment"}…`}
                    rows={2}
                    autoFocus
                    aria-label="Write a reply"
                  />
                  {replyError && <p className="mt-1.5 text-sm text-red-500">{replyError}</p>}
                  <div className="mt-2 flex justify-end gap-2">
                    <Button type="button" size="sm" variant="ghost" onClick={() => setReplyingTo(null)}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" loading={replying} disabled={!replyText.trim()}>
                      Reply
                    </Button>
                  </div>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
