"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import { Blog, ReadingListSummary } from "@/lib/types";
import { ArticleRow } from "./ArticleRow";
import { Avatar } from "./Avatar";
import { Button } from "./ui/Button";
import { EmptyState, ErrorState, Spinner } from "./states";

/** One reading list. Its owner can make it public or private, or delete it. */
export function ListView({ id }: { id: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [list, setList] = useState<ReadingListSummary | null>(null);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api<{ list: ReadingListSummary; blogs: Blog[] }>(`/lists/${id}`);
      setList(res.list);
      setBlogs(res.blogs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load this list.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const isOwner = !!user && !!list?.owner && list.owner._id === user._id;

  async function toggleVisibility() {
    if (!list) return;
    setBusy(true);
    try {
      const res = await api<{ list: ReadingListSummary }>(`/lists/${id}`, { method: "PUT", body: { isPublic: !list.isPublic } });
      setList({ ...list, isPublic: res.list.isPublic });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this list? The posts in it aren't affected.")) return;
    setBusy(true);
    try {
      await api(`/lists/${id}`, { method: "DELETE" });
      router.push("/bookmarks");
    } catch {
      setBusy(false);
    }
  }

  if (loading) return <div className="mx-auto max-w-3xl px-5"><Spinner label="Loading list…" /></div>;
  if (error || !list)
    return (
      <div className="mx-auto max-w-3xl px-5 py-10">
        <ErrorState message={error || "This list doesn't exist."} onRetry={load} />
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-6">
      <header className="mb-10 rule-bottom pb-6">
        <p className="label text-muted">{list.isPublic ? "List" : "Private list"}</p>
        <h1 className="mt-3 font-display text-[2rem] font-semibold tracking-[-0.02em]">{list.name}</h1>
        {list.description && <p className="mt-2 text-muted">{list.description}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted">
          {list.owner && (
            <Link href={`/author/${list.owner._id}`} className="flex items-center gap-2 hover:text-fg">
              <Avatar name={list.owner.name} src={list.owner.avatarUrl} size={24} />
              {list.owner.name}
            </Link>
          )}
          <span>
            {blogs.length} {blogs.length === 1 ? "post" : "posts"}
          </span>
          {isOwner && (
            <span className="ml-auto flex gap-2">
              <Button size="sm" variant="secondary" loading={busy} onClick={toggleVisibility}>
                Make {list.isPublic ? "private" : "public"}
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={remove} className="text-red-500">
                Delete
              </Button>
            </span>
          )}
        </div>
      </header>

      {blogs.length === 0 ? (
        <EmptyState title="This list is empty" hint={isOwner ? "Use Save on any article to add it here." : undefined} />
      ) : (
        <div>
          {blogs.map((b, i) => (
            <ArticleRow key={b._id} blog={b} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
