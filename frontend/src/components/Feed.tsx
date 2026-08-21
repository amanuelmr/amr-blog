"use client";

import { useEffect, useState, useCallback } from "react";
import { Blog } from "@/lib/types";
import { api, ApiError } from "@/lib/api";
import { FeaturedLead } from "./FeaturedLead";
import { ArticleRow } from "./ArticleRow";
import { Pagination } from "./Pagination";
import { Spinner, EmptyState, ErrorState } from "./states";

const PAGE_SIZE = 9;

interface FeedResponse {
  blogs: Blog[];
  total: number;
  page: number;
  totalPages: number;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-3">
      <span className="label text-muted">{children}</span>
      <span className="h-px flex-1 bg-rule" />
    </div>
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
  const listBlogs = showHero ? blogs.slice(1) : blogs;
  // Continuous numbering: page 2 starts where page 1 left off.
  const rowOffset = (page - 1) * PAGE_SIZE + (showHero ? 1 : 0);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-16">
      {/* Masthead */}
      {q ? (
        <header className="mb-10 rule-bottom pb-6">
          <p className="label text-muted">Search</p>
          <h1 className="mt-3 font-display text-[2rem] font-semibold tracking-[-0.02em] sm:text-[2.5rem]">
            “{q}”
          </h1>
          {data && (
            <p className="mt-2 text-muted">
              {data.total} {data.total === 1 ? "result" : "results"}
            </p>
          )}
        </header>
      ) : (
        page === 1 && (
          <header className="mb-12">
            <p className="label text-accent">AMR · Journal</p>
            <h1 className="mt-4 text-balance font-display text-[2.4rem] font-semibold leading-[1.05] tracking-[-0.025em] sm:text-[3.25rem]">
              Writing on building software.
            </h1>
            <p className="mt-4 max-w-measure text-[1.0625rem] leading-relaxed text-muted">
              Essays and field notes on backend, systems, and the craft of shipping things that last.
            </p>
          </header>
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
          {showHero && (
            <div className="mb-16">
              <FeaturedLead blog={blogs[0]} />
            </div>
          )}

          {listBlogs.length > 0 && (
            <section>
              <SectionLabel>{showHero ? "The Latest" : q ? "Results" : "More stories"}</SectionLabel>
              <div>
                {listBlogs.map((b, i) => (
                  <ArticleRow key={b._id} blog={b} index={rowOffset + i} />
                ))}
              </div>
            </section>
          )}

          {data && <Pagination page={data.page} totalPages={data.totalPages} makeHref={makeHref} />}
        </>
      )}
    </div>
  );
}
