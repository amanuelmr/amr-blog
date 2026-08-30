"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Blog } from "@/lib/types";
import { blogHref, formatDate, readingTime, excerpt } from "@/lib/format";
import { InlineError, Skeleton } from "@/components/states";

interface FeedResponse {
  blogs: Blog[];
}

const RELATED = 3;

type Status = "loading" | "error" | "success";

function ContinueReadingSkeleton() {
  return (
    <section className="mt-16 rule-top pt-8" aria-hidden="true">
      <Skeleton className="h-[0.6875rem] w-32" />
      <ul className="mt-5 flex flex-col">
        {Array.from({ length: RELATED }).map((_, i) => (
          <li key={i} className={i === 0 ? "py-4" : "rule-top py-4"}>
            <Skeleton className="h-5 w-full max-w-md" />
            <Skeleton className="mt-2 h-3.5 w-full max-w-lg" />
            <Skeleton className="mt-2 h-2.5 w-24" />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * An article that ends in a footer is a dead end. This picks up the reader:
 * pieces sharing a topic first, then the neighbours in publication order, so
 * there is always somewhere to go next.
 */
export function ContinueReading({ blog }: { blog: Blog }) {
  const [feed, setFeed] = useState<Blog[]>([]);
  const [status, setStatus] = useState<Status>("loading");

  const load = useCallback(() => {
    let cancelled = false;
    setStatus("loading");
    api<FeedResponse>("/blogs?limit=50")
      .then((res) => {
        if (cancelled) return;
        setFeed(res.blogs ?? []);
        setStatus("success");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => load(), [load]);

  if (status === "loading") return <ContinueReadingSkeleton />;
  if (status === "error") {
    return (
      <section className="mt-16 rule-top pt-8">
        <InlineError message="Couldn't load more reading." onRetry={load} />
      </section>
    );
  }
  if (feed.length < 2) return null;

  const others = feed.filter((b) => b._id !== blog._id);
  const tags = new Set(blog.tags ?? []);

  // Rank by how many topics a piece shares with this one; ties keep feed order.
  const related = others
    .map((b) => ({ b, shared: (b.tags ?? []).filter((t) => tags.has(t)).length }))
    .filter((x) => x.shared > 0)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, RELATED)
    .map((x) => x.b);

  // The feed is newest-first, so the previous article sits after this one.
  const index = feed.findIndex((b) => b._id === blog._id);
  const newer = index > 0 ? feed[index - 1] : null;
  const older = index >= 0 && index < feed.length - 1 ? feed[index + 1] : null;

  if (related.length === 0 && !newer && !older) return null;

  const sharedTopic = related.length > 0 ? (blog.tags ?? [])[0] : null;

  return (
    <section className="mt-16 rule-top pt-8">
      {related.length > 0 && (
        <>
          <h2 className="label text-muted">
            {sharedTopic ? `More on ${sharedTopic}` : "Continue reading"}
          </h2>
          <ul className="mt-5 flex flex-col">
            {related.map((b, i) => (
              <li key={b._id} className={i === 0 ? undefined : "rule-top"}>
                <Link href={blogHref(b)} className="group block py-4">
                  <h3 className="font-display text-[1.15rem] font-semibold leading-snug tracking-[-0.01em] transition-colors group-hover:text-accent">
                    {b.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-[0.9375rem] leading-relaxed text-muted">
                    {excerpt(b.content, 120)}
                  </p>
                  <p className="mt-1.5 font-mono text-[0.6875rem] tabular-nums text-muted">
                    {formatDate(b.createdAt)}
                    <span className="mx-1.5 text-faint" aria-hidden="true">·</span>
                    {readingTime(b.content)} min read
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {(newer || older) && (
        <nav
          aria-label="Article navigation"
          // Only split into two when both neighbours exist — a lone half would
          // otherwise sit next to an empty panel.
          className={`mt-8 grid gap-px overflow-hidden rounded-md border border-border bg-border ${
            older && newer ? "sm:grid-cols-2" : "sm:grid-cols-1"
          }`}
        >
          {older && (
            <Link href={blogHref(older)} className="group bg-card p-4 transition-colors hover:bg-subtle">
              <span className="label text-faint">Previous</span>
              <p className="mt-1.5 text-[0.9375rem] font-semibold leading-snug transition-colors group-hover:text-accent">
                {older.title}
              </p>
            </Link>
          )}
          {newer && (
            <Link
              href={blogHref(newer)}
              className={`group bg-card p-4 transition-colors hover:bg-subtle ${older ? "sm:text-right" : ""}`}
            >
              <span className="label text-faint">Next</span>
              <p className="mt-1.5 text-[0.9375rem] font-semibold leading-snug transition-colors group-hover:text-accent">
                {newer.title}
              </p>
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}
