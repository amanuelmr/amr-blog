"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Blog } from "@/lib/types";
import { blogHref, formatDate } from "@/lib/format";

interface FeedResponse {
  blogs: Blog[];
}

const MOST_READ = 5;
const MAX_TOPICS = 10;

/**
 * The secondary column: what people actually read, and what the journal
 * actually covers. Both are derived from one feed request rather than new
 * endpoints, and both show real numbers — a rail of invented "trending"
 * would be decoration, not information.
 */
export function SideRail({ currentId }: { currentId?: string }) {
  const [blogs, setBlogs] = useState<Blog[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<FeedResponse>("/blogs?limit=50")
      .then((res) => {
        if (!cancelled) setBlogs(res.blogs ?? []);
      })
      .catch(() => {
        if (!cancelled) setBlogs([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!blogs || blogs.length === 0) return null;

  const mostRead = [...blogs]
    .filter((b) => b._id !== currentId)
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .slice(0, MOST_READ);

  const counts: Record<string, number> = {};
  for (const b of blogs) for (const t of b.tags ?? []) counts[t] = (counts[t] ?? 0) + 1;
  const topics = Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, MAX_TOPICS);

  return (
    <aside className="flex flex-col gap-10">
      {mostRead.length > 0 && (
        <section>
          <h2 className="label inline-block border-b-2 border-accent pb-2 text-fg">Most read</h2>
          <ol className="mt-4">
            {mostRead.map((b, i) => (
              <li key={b._id} className="rule-top first:border-t-0">
                <Link href={blogHref(b)} className="group grid grid-cols-[2.25rem_1fr] gap-3 py-3.5">
                  <span
                    className="font-mono text-[1.375rem] font-bold leading-none tabular-nums text-border transition-colors group-hover:text-accent"
                    aria-hidden="true"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[0.9375rem] font-semibold leading-snug text-fg transition-colors group-hover:text-accent">
                      {b.title}
                    </p>
                    <p className="mt-1 font-mono text-[0.6875rem] tabular-nums text-muted">
                      {formatDate(b.createdAt)}
                      <span className="mx-1.5 text-faint" aria-hidden="true">·</span>
                      {(b.views ?? 0).toLocaleString()} views
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {topics.length > 0 && (
        <section>
          <h2 className="label inline-block border-b-2 border-accent pb-2 text-fg">Topics</h2>
          <ul className="mt-4 flex flex-col">
            {topics.map(([tag, count]) => (
              <li key={tag} className="rule-top first:border-t-0">
                <Link
                  href={`/?q=${encodeURIComponent(tag)}`}
                  className="group flex items-baseline justify-between gap-3 py-2"
                >
                  <span className="truncate font-mono text-[0.8125rem] text-muted transition-colors group-hover:text-accent">
                    {tag}
                  </span>
                  <span className="flex-none font-mono text-[0.6875rem] tabular-nums text-faint">{count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
