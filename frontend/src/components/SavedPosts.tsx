"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { Blog, ReadingListSummary } from "@/lib/types";
import { ListCards } from "./ListCards";
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
  const [lists, setLists] = useState<ReadingListSummary[]>([]);

  useEffect(() => {
    api<{ lists: ReadingListSummary[] }>("/lists/mine")
      .then((res) => setLists(res.lists))
      .catch(() => {});
  }, []);

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
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold tracking-tight">Saved</h1>
        <Link href="/history" className="text-sm text-accent hover:underline">Reading history →</Link>
      </div>

      {lists.length > 0 && (
        <section className="mb-12">
          <h2 className="label mb-4 text-muted">Your lists</h2>
          <ListCards lists={lists} />
        </section>
      )}

      <h2 className="label mb-2 text-muted">Reading list</h2>

      {loading ? (
        <Spinner label="Loading your reading list…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !data || data.blogs.length === 0 ? (
        <EmptyState title="Nothing saved yet" hint="Use Save on an article to add it to your reading list, or to a list of your own." />
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
