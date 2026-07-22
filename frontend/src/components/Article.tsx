"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Blog } from "@/lib/types";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { CoverImage } from "./CoverImage";
import { Avatar } from "./Avatar";
import { TagChip } from "./TagChip";
import { LikeButton } from "./LikeButton";
import { CommentSection } from "./CommentSection";
import { Spinner, ErrorState } from "./states";
import { formatDate, readingTime, contentToHtml } from "@/lib/format";
import DOMPurify from "isomorphic-dompurify";

export function Article({ id }: { id: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api<Blog>(`/blogs/${id}`);
      setBlog(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load this article.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function onDelete() {
    if (!confirm("Delete this article permanently?")) return;
    setDeleting(true);
    try {
      await api(`/blogs/${id}`, { method: "DELETE" });
      router.push("/");
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Could not delete.");
      setDeleting(false);
    }
  }

  if (loading) return <div className="mx-auto max-w-3xl px-4 sm:px-6"><Spinner label="Loading article…" /></div>;
  if (error || !blog)
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <ErrorState message={error || "Article not found."} onRetry={load} />
        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-accent hover:underline">← Back to home</Link>
        </div>
      </div>
    );

  const isOwner = !!user && !!blog.author && blog.author._id === user._id;
  // Content is sanitized server-side on save; sanitize again here (DOMPurify)
  // as defense-in-depth before injecting it into the DOM.
  const html = DOMPurify.sanitize(contentToHtml(blog.content));

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/" className="mb-8 inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        ← All articles
      </Link>

      {blog.tags?.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {blog.tags.map((t) => (
            <TagChip key={t} tag={t} href={`/?q=${encodeURIComponent(t)}`} />
          ))}
        </div>
      )}

      <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl">
        {blog.title}
      </h1>

      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted">
        <span className="flex items-center gap-2.5">
          <Avatar name={blog.author?.name} size={40} />
          <span className="font-medium text-fg">{blog.author?.name ?? "Unknown"}</span>
        </span>
        <span className="text-border">·</span>
        <span>{formatDate(blog.createdAt)}</span>
        <span className="text-border">·</span>
        <span>{readingTime(blog.content)} min read</span>

        {isOwner && (
          <span className="ml-auto flex gap-2">
            <Link
              href={`/blog/${blog._id}/edit`}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm hover:bg-subtle"
            >
              Edit
            </Link>
            <button
              onClick={onDelete}
              disabled={deleting}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-red-500 hover:bg-red-500/10 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </span>
        )}
      </div>

      {blog.titleBackgroundImageUrl && (
        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl bg-subtle">
          <CoverImage src={blog.titleBackgroundImageUrl} title={blog.title} priority sizes="(max-width: 768px) 100vw, 768px" />
        </div>
      )}

      <div
        className="prose prose-stone dark:prose-invert prose-lg mt-10 max-w-none prose-a:text-accent prose-img:rounded-xl"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <div className="mt-10 flex items-center gap-4 border-t border-border pt-6">
        <LikeButton blogId={blog._id} initialLikes={blog.likes ?? []} />
        <span className="text-sm text-muted">
          {blog.comments?.length ?? 0} comment{(blog.comments?.length ?? 0) === 1 ? "" : "s"}
        </span>
      </div>

      <CommentSection blogId={blog._id} />
    </article>
  );
}
