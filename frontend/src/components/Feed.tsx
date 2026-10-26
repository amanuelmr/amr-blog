"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Blog } from "@/lib/types";
import { api, ApiError } from "@/lib/api";
import { FeaturedLead } from "./FeaturedLead";
import { ArticleRow } from "./ArticleRow";
import { Pagination } from "./Pagination";
import { SideRail } from "./SideRail";
import { EmptyState, ErrorState, Skeleton } from "./states";

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

/** Mirrors the row list's shape so the page doesn't jump once real rows arrive. */
function FeedSkeleton() {
  return (
    <div aria-hidden="true">
      <SectionLabel>Latest writing</SectionLabel>
      <div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="grid grid-cols-[2rem_1fr] gap-x-4 gap-y-2 border-t border-rule py-6 sm:grid-cols-[2.5rem_1fr_auto] sm:gap-x-6">
            <Skeleton className="h-3 w-5" />
            <div className="min-w-0">
              <Skeleton className="h-5 w-full max-w-md" />
              <Skeleton className="mt-2.5 h-3.5 w-full max-w-lg" />
              <Skeleton className="mt-1.5 h-3.5 w-2/3 max-w-sm" />
              <Skeleton className="mt-3 h-2.5 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export type FeedView = "latest" | "for-you";

// Latest / For you switch. Only for signed-in readers — recommendations come
// from what they've read and liked.
function FeedTabs({ view }: { view: FeedView }) {
  const tabs: { id: FeedView; label: string; href: string }[] = [
    { id: "latest", label: "Latest", href: "/" },
    { id: "for-you", label: "For you", href: "/?view=for-you" },
  ];
  return (
    <nav aria-label="Feed" className="mb-8 flex gap-6 border-b border-rule">
      {tabs.map((t) => (
        <Link
          key={t.id}
          href={t.href}
          aria-current={view === t.id ? "page" : undefined}
          className={`-mb-px border-b-2 pb-3 text-sm font-medium transition-colors ${
            view === t.id ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function Feed({ q, page, view }: { q: string; page: number; view: FeedView }) {
  const { user, loading: authLoading } = useAuth();
  // Recommendations need a signed-in reader and don't mix with search.
  const forYou = view === "for-you" && !q && !!user;
  const [data, setData] = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Which request is current. Auth resolves after the first render, so
  // the feed can fire twice (signed-out, then signed-in); only the latest
  // request's response may land, or a slow earlier one would overwrite it.
  const requestId = useRef(0);

  const fetchData = useCallback(async () => {
    // Until auth resolves we can't tell For you from Latest — wait rather
    // than load (and flash) the wrong list.
    if (view === "for-you" && authLoading) return;
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      const path = q
        ? `/blogs/search?query=${encodeURIComponent(q)}&${params}`
        : forYou
          ? `/blogs/recommend?${params}`
          : `/blogs?${params}`;
      const res = await api<FeedResponse>(path);
      if (id !== requestId.current) return;
      setData(res);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err instanceof ApiError ? err.message : "Could not load articles.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [q, page, forYou, view, authLoading]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const makeHref = (p: number) =>
    q ? `/?q=${encodeURIComponent(q)}&page=${p}` : forYou ? `/?view=for-you&page=${p}` : `/?page=${p}`;

  const showHero = !q && page === 1 && !forYou;
  const blogs = data?.blogs ?? [];
  const listBlogs = showHero ? blogs.slice(1) : blogs;
  // Continuous numbering: page 2 starts where page 1 left off.
  const rowOffset = (page - 1) * PAGE_SIZE + (showHero ? 1 : 0);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-16">
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
            {/* On For you, data.total counts recommendations, not the archive. */}
            {data && !forYou && (
              <p className="mb-3 flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
                <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                </span>
                Currently building
                <span className="text-faint" aria-hidden="true">·</span>
                {data.total} {data.total === 1 ? "piece" : "pieces"} published
              </p>
            )}
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

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-14">
        <div className="min-w-0">
      {user && !q && <FeedTabs view={forYou ? "for-you" : "latest"} />}
      {loading ? (
        <FeedSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : blogs.length === 0 ? (
        forYou ? (
          <EmptyState
            title="Nothing to recommend yet"
            hint="Read or like a few pieces and you'll find more on the same topics here."
          />
        ) : (
          <EmptyState
            title={q ? "No matching articles" : "No articles yet"}
            hint={q ? "Try a different search term." : "Check back soon — or write the first one."}
          />
        )
      ) : (
        <>
          {showHero && (
            <div className="mb-16">
              <FeaturedLead blog={blogs[0]} />
            </div>
          )}

          {listBlogs.length > 0 && (
            <section>
              <SectionLabel>
                {showHero ? "The Latest" : q ? "Results" : forYou ? "Picked for you" : "More stories"}
              </SectionLabel>
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

        {/* Secondary column: what people read, and what this journal covers. */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <SideRail />
        </div>
      </div>
    </div>
  );
}
