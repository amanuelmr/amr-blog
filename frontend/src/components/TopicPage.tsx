"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { Blog } from "@/lib/types";
import { ArticleRow } from "./ArticleRow";
import { Pagination } from "./Pagination";
import { EmptyState, ErrorState, Spinner } from "./states";

const PAGE_SIZE = 10;

interface FeedResponse {
  blogs: Blog[];
  total: number;
  page: number;
  totalPages: number;
}

/** Every live post carrying one tag, newest first, with the topic's RSS feed. */
export function TopicPage({ tag, page }: { tag: string; page: number }) {
  const [data, setData] = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const base = `/tag/${encodeURIComponent(tag)}`;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await api<FeedResponse>(`/blogs?tag=${encodeURIComponent(tag)}&page=${page}&limit=${PAGE_SIZE}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load this topic.");
    } finally {
      setLoading(false);
    }
  }, [tag, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-16">
      <header className="mb-10 rule-bottom pb-6">
        <p className="label text-muted">Topic</p>
        <h1 className="mt-3 font-display text-[2rem] font-semibold tracking-[-0.02em] sm:text-[2.5rem]">{tag}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 text-muted">
          {data && (
            <span>
              {data.total} {data.total === 1 ? "piece" : "pieces"}
            </span>
          )}
          <a href={`${base}/rss.xml`} className="text-sm text-accent hover:underline">
            RSS feed
          </a>
        </div>
      </header>

      {loading ? (
        <Spinner label="Loading…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !data || data.blogs.length === 0 ? (
        <EmptyState title={`Nothing on ${tag} yet`} hint="Check back soon." />
      ) : (
        <>
          <div>
            {data.blogs.map((b, i) => (
              <ArticleRow key={b._id} blog={b} index={(page - 1) * PAGE_SIZE + i} />
            ))}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} makeHref={(p) => `${base}?page=${p}`} />
        </>
      )}

      <div className="mt-8 text-center">
        <Link href="/" className="text-sm text-accent hover:underline">← All writing</Link>
      </div>
    </div>
  );
}
