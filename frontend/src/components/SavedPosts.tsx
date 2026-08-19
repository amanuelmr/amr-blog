"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api";
import { Blog } from "@/lib/types";
import { RequireAuth } from "./RequireAuth";
import { ArticleRow } from "./ArticleRow";
import { Spinner, EmptyState, ErrorState } from "./states";
import { Pagination } from "./Pagination";

const PAGE_SIZE = 10;

interface BookmarksResponse {
  blogs: Blog[];
  total: number;
  page: number;
  totalPages: number;
}

function SavedPostsInner({ page }: { page: number }) {
  const [data, setData] = useState<BookmarksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api<BookmarksResponse>(`/blogs/bookmarks?page=${page}&limit=${PAGE_SIZE}`);
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load your reading list.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-4xl px-5 py-12 sm:px-6">
      <h1 className="mb-8 font-serif text-3xl font-bold tracking-tight">Reading list</h1>

      {loading ? (
        <Spinner label="Loading your reading list…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !data || data.blogs.length === 0 ? (
        <EmptyState title="Nothing saved yet" hint="Tap Save on an article to add it to your reading list." />
      ) : (
        <>
          <div>
            {data.blogs.map((b, i) => (
              <ArticleRow key={b._id} blog={b} index={i} />
            ))}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} makeHref={(p) => `/bookmarks?page=${p}`} />
        </>
      )}
    </div>
  );
}

export function SavedPosts({ page }: { page: number }) {
  return (
    <RequireAuth>
      <SavedPostsInner page={page} />
    </RequireAuth>
  );
}
