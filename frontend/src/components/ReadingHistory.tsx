"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Blog } from "@/lib/types";
import { RequireAuth } from "./RequireAuth";
import { ArticleRow } from "./ArticleRow";
import { Pagination } from "./Pagination";
import { Button } from "./ui/Button";
import { EmptyState, ErrorState, Spinner } from "./states";

const PAGE_SIZE = 10;

interface HistoryResponse {
  blogs: Blog[];
  total: number;
  page: number;
  totalPages: number;
}

function ReadingHistoryInner({ page }: { page: number }) {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [clearing, setClearing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await api<HistoryResponse>(`/blogs/history?page=${page}&limit=${PAGE_SIZE}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load your history.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  async function clear() {
    if (!confirm("Clear your reading history? Recommendations will start over.")) return;
    setClearing(true);
    try {
      await api("/blogs/history", { method: "DELETE" });
      setData({ blogs: [], total: 0, page: 1, totalPages: 0 });
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-12 sm:px-6">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold tracking-tight">Reading history</h1>
        {!!data?.total && (
          <Button size="sm" variant="ghost" loading={clearing} onClick={clear}>
            Clear history
          </Button>
        )}
      </div>
      {loading ? (
        <Spinner label="Loading…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !data || data.blogs.length === 0 ? (
        <EmptyState title="Nothing here yet" hint="Posts you read show up here, most recent first." />
      ) : (
        <>
          <div>
            {data.blogs.map((b, i) => (
              <ArticleRow key={b._id} blog={b} index={(page - 1) * PAGE_SIZE + i} />
            ))}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} makeHref={(p) => `/history?page=${p}`} />
        </>
      )}
    </div>
  );
}

export function ReadingHistory({ page }: { page: number }) {
  return (
    <RequireAuth>
      <ReadingHistoryInner page={page} />
    </RequireAuth>
  );
}
