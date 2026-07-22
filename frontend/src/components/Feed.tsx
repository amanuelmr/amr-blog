"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Blog } from "@/lib/types";
import { api, ApiError } from "@/lib/api";
import { BlogCard } from "./BlogCard";
import { CoverImage } from "./CoverImage";
import { Avatar } from "./Avatar";
import { TagChip } from "./TagChip";
import { Pagination } from "./Pagination";
import { Spinner, EmptyState, ErrorState } from "./states";
import { formatDate, readingTime, excerpt, blogHref } from "@/lib/format";

const PAGE_SIZE = 9;

interface FeedResponse {
  blogs: Blog[];
  total: number;
  page: number;
  totalPages: number;
}

function FeaturedHero({ blog }: { blog: Blog }) {
  return (
    <Link
      href={blogHref(blog)}
      className="group mb-12 grid gap-6 overflow-hidden rounded-2xl border border-border bg-card md:grid-cols-2"
    >
      <div className="relative aspect-[16/11] overflow-hidden bg-subtle md:aspect-auto">
        <div className="h-full w-full transition-transform duration-500 group-hover:scale-105">
          <CoverImage src={blog.titleBackgroundImageUrl} title={blog.title} priority sizes="(max-width: 768px) 100vw, 600px" />
        </div>
      </div>
      <div className="flex flex-col justify-center gap-4 p-6 md:p-10">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-accent">Featured</span>
          {blog.tags?.[0] && <TagChip tag={blog.tags[0]} />}
        </div>
        <h2 className="text-balance text-3xl font-bold leading-tight transition-colors group-hover:text-accent md:text-4xl">
          {blog.title}
        </h2>
        <p className="text-muted">{excerpt(blog.content, 220)}</p>
        <div className="mt-2 flex items-center gap-2.5 text-sm text-muted">
          <Avatar name={blog.author?.name} size={32} />
          <span className="text-fg">{blog.author?.name ?? "Unknown"}</span>
          <span className="text-border">·</span>
          <span>{formatDate(blog.createdAt)}</span>
          <span className="text-border">·</span>
          <span>{readingTime(blog.content)} min read</span>
        </div>
      </div>
    </Link>
  );
}

export function Feed({ q, page }: { q: string; page: number }) {
  const [data, setData] = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      const path = q
        ? `/blogs/search?query=${encodeURIComponent(q)}&${params}`
        : `/blogs?${params}`;
      const res = await api<FeedResponse>(path);
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load articles.");
    } finally {
      setLoading(false);
    }
  }, [q, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const makeHref = (p: number) =>
    q ? `/?q=${encodeURIComponent(q)}&page=${p}` : `/?page=${p}`;

  const showHero = !q && page === 1;
  const blogs = data?.blogs ?? [];
  const gridBlogs = showHero ? blogs.slice(1) : blogs;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {q ? (
        <div className="mb-8">
          <p className="text-sm text-muted">Search results</p>
          <h1 className="text-2xl font-bold">
            “{q}”{data ? ` · ${data.total} found` : ""}
          </h1>
        </div>
      ) : (
        page === 1 && (
          <div className="mb-10 max-w-2xl">
            <h1 className="text-balance text-4xl font-bold tracking-tight">
              Writing on building software.
            </h1>
            <p className="mt-3 text-lg text-muted">
              Notes on backend, systems, and the craft of shipping things that last.
            </p>
          </div>
        )
      )}

      {loading ? (
        <Spinner label="Loading articles…" />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : blogs.length === 0 ? (
        <EmptyState
          title={q ? "No matching articles" : "No articles yet"}
          hint={q ? "Try a different search term." : "Check back soon — or write the first one."}
        />
      ) : (
        <>
          {showHero && <FeaturedHero blog={blogs[0]} />}
          {gridBlogs.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {gridBlogs.map((b) => (
                <BlogCard key={b._id} blog={b} />
              ))}
            </div>
          )}
          {data && <Pagination page={data.page} totalPages={data.totalPages} makeHref={makeHref} />}
        </>
      )}
    </div>
  );
}
