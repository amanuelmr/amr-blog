"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Blog } from "@/lib/types";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { CoverImage } from "./CoverImage";
import { Avatar } from "./Avatar";
import { LikeButton } from "./LikeButton";
import { BookmarkButton } from "./BookmarkButton";
import { CommentSection } from "./CommentSection";
import { ContinueReading } from "./ContinueReading";
import { TableOfContents } from "./TableOfContents";
import { ReadingProgress } from "./ReadingProgress";
import { Spinner, ErrorState } from "./states";
import { formatDate, readingTime, contentToHtml, publishState } from "@/lib/format";
import { withHeadingAnchors } from "@/lib/toc";
import { enhanceCodeBlocks } from "@/lib/codeHighlight";
import DOMPurify from "isomorphic-dompurify";

export function Article({ id }: { id: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLElement>(null);

  // Content is sanitized server-side on save; sanitize again here (DOMPurify)
  // as defense-in-depth before injecting it into the DOM.
  const { html, headings } = useMemo(() => {
    if (!blog) return { html: "", headings: [] };
    const sanitized = DOMPurify.sanitize(contentToHtml(blog.content));
    return withHeadingAnchors(sanitized);
  }, [blog]);

  useEffect(() => {
    if (contentRef.current) enhanceCodeBlocks(contentRef.current);
  }, [html]);

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

  if (loading) return <div className="mx-auto max-w-[42rem] px-5 sm:px-6"><Spinner label="Loading article…" /></div>;
  if (error || !blog)
    return (
      <div className="mx-auto max-w-[42rem] px-5 py-10 sm:px-6">
        <ErrorState message={error || "Article not found."} onRetry={load} />
        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-accent hover:underline">← Back to home</Link>
        </div>
      </div>
    );

  const isOwner = !!user && !!blog.author && blog.author._id === user._id;
  const state = publishState(blog);

  return (
    <article ref={articleRef} className="relative mx-auto max-w-[42rem] px-5 py-10 sm:px-6">
      <ReadingProgress targetRef={articleRef} />

      <Link href="/" className="mb-8 inline-flex items-center gap-1.5 text-meta text-muted transition-colors hover:text-fg">
        ← All writing
      </Link>

      {isOwner && state !== "live" && (
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400">
          {state === "draft"
            ? "This is a draft — only you can see it."
            : `Scheduled to publish on ${formatDate(blog.publishedAt ?? undefined)} — only you can see it until then.`}
        </div>
      )}

      {blog.tags?.length > 0 && (
        <div className="label mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-accent">
          {blog.tags.map((t, i) => (
            <span key={t} className="flex items-center gap-2">
              {i > 0 && <span className="text-faint" aria-hidden="true">/</span>}
              <Link href={`/?q=${encodeURIComponent(t)}`} className="hover:underline">
                {t}
              </Link>
            </span>
          ))}
        </div>
      )}

      <h1 className="text-balance font-display text-[2rem] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[2.6rem] md:text-[3rem]">
        {blog.title}
      </h1>

      <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 rule-bottom pb-5 text-meta text-muted">
        {blog.author ? (
          <Link href={`/author/${blog.author._id}`} className="flex items-center gap-2.5 hover:text-fg">
            <Avatar name={blog.author.name} size={34} />
            <span className="font-medium text-fg">{blog.author.name}</span>
          </Link>
        ) : (
          <span className="flex items-center gap-2.5">
            <Avatar />
            <span className="font-medium text-fg">Unknown</span>
          </span>
        )}
        <span className="text-border">·</span>
        <span>{formatDate(blog.createdAt)}</span>
        <span className="text-border">·</span>
        <span>{readingTime(blog.content)} min read</span>
        <span className="text-border">·</span>
        <span>{blog.views.toLocaleString()} view{blog.views === 1 ? "" : "s"}</span>

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
        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-md bg-subtle">
          <CoverImage src={blog.titleBackgroundImageUrl} title={blog.title} priority sizes="(max-width: 768px) 100vw, 768px" />
        </div>
      )}

      <TableOfContents headings={headings} />

      <div
        ref={contentRef}
        className="prose prose-stone dark:prose-invert mt-10 max-w-none text-[1.0625rem] leading-[1.75] prose-a:text-accent prose-a:underline prose-a:decoration-accent/30 prose-a:underline-offset-2 prose-img:rounded-md"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <div className="mt-12 flex items-center gap-3 rule-top pt-6">
        <LikeButton blogId={blog._id} initialLikes={blog.likes ?? []} />
        <BookmarkButton blogId={blog._id} initialBookmarked={blog.bookmarked ?? false} />
      </div>

      <ContinueReading blog={blog} />

      <CommentSection blogId={blog._id} />
    </article>
  );
}
