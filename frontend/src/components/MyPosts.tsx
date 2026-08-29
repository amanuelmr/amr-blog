"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { Blog } from "@/lib/types";
import { RequireAuth } from "./RequireAuth";
import { Spinner, EmptyState, ErrorState } from "./states";
import { Pagination } from "./Pagination";
import { LinkButton } from "./ui/Button";
import { blogHref, formatDate, publishState } from "@/lib/format";

const PAGE_SIZE = 20;

interface MineResponse {
  blogs: Blog[];
  total: number;
  page: number;
  totalPages: number;
}

function StatusBadge({ blog }: { blog: Blog }) {
  const state = publishState(blog);
  const label =
    state === "draft" ? "Draft" : state === "scheduled" ? `Scheduled for ${formatDate(blog.publishedAt ?? undefined)}` : "Live";
  const tone =
    state === "draft"
      ? "border-border bg-subtle text-muted"
      : state === "scheduled"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-600"
        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600";
  return (
    <span className={`inline-flex flex-none items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tone}`}>
      {label}
    </span>
  );
}

function MyPostsInner({ page }: { page: number }) {
  const [data, setData] = useState<MineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api<MineResponse>(`/blogs/mine?page=${page}&limit=${PAGE_SIZE}`);
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load your posts.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-6">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold tracking-tight">Your posts</h1>
        <LinkButton href="/write" size="sm">New post</LinkButton>
      </div>

      {loading ? (
        <Spinner label="Loading your posts…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !data || data.blogs.length === 0 ? (
        <EmptyState title="No posts yet" hint="Start writing — drafts are saved here until you publish." />
      ) : (
        <>
          <ul className="divide-y divide-border">
            {data.blogs.map((b) => (
              <li key={b._id} className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="truncate font-medium text-fg">{b.title || "Untitled"}</p>
                  <p className="mt-1 text-xs text-muted">{formatDate(b.createdAt)}</p>
                </div>
                <div className="flex flex-none items-center gap-3">
                  <StatusBadge blog={b} />
                  <Link href={`/blog/${b._id}/edit`} className="text-sm text-accent hover:underline">
                    Edit
                  </Link>
                  {publishState(b) === "live" && (
                    <Link href={blogHref(b)} className="text-sm text-muted hover:text-fg">
                      View
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <Pagination page={data.page} totalPages={data.totalPages} makeHref={(p) => `/write/mine?page=${p}`} />
        </>
      )}
    </div>
  );
}

export function MyPosts({ page }: { page: number }) {
  return (
    <RequireAuth>
      <MyPostsInner page={page} />
    </RequireAuth>
  );
}
