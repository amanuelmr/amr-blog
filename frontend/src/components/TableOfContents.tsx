"use client";

import { useEffect, useState } from "react";
import { Heading } from "@/lib/toc";

/**
 * Two presentations of one list. On wide screens it sits in the margin beside
 * the article and tracks the section you are reading; on narrow screens it
 * collapses into a disclosure so it never pushes the article down the page.
 */
export function TableOfContents({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    if (headings.length < 2) return;
    const nodes = headings
      .map((h) => document.getElementById(h.id))
      .filter((n): n is HTMLElement => !!n);
    if (!nodes.length) return;

    // The heading closest above the reading line is the active one. Recomputing
    // from scroll position (rather than trusting intersection order) keeps it
    // correct when several short sections are on screen at once.
    const onScroll = () => {
      const line = 120;
      let current = nodes[0].id;
      for (const node of nodes) {
        if (node.getBoundingClientRect().top <= line) current = node.id;
        else break;
      }
      setActiveId(current);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [headings]);

  if (headings.length < 2) return null;

  const list = (
    <ol className="flex flex-col text-[0.8125rem]">
      {headings.map((h, i) => (
        <li key={h.id} className={h.level === 3 ? "pl-3" : undefined}>
          <a
            href={`#${h.id}`}
            aria-current={activeId === h.id ? "true" : undefined}
            className="toc-link"
          >
            <span className="mr-2 font-mono text-[0.6875rem] tabular-nums text-faint">
              {String(i + 1).padStart(2, "0")}
            </span>
            {h.text}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <>
      {/* Mobile / tablet: collapsed by default */}
      <details className="group mt-8 rule-top rule-bottom py-3 lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <span className="label text-muted">On this page</span>
          <span className="text-muted transition-transform group-open:rotate-180" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </summary>
        <nav aria-label="Table of contents" className="mt-3">
          {list}
        </nav>
      </details>

      {/* Desktop: pinned in the margin */}
      <nav
        aria-label="Table of contents"
        className="pointer-events-none absolute left-full top-0 hidden h-full w-56 pl-10 lg:block"
      >
        <div className="pointer-events-auto sticky top-24">
          <p className="label mb-3 text-faint">On this page</p>
          {list}
        </div>
      </nav>
    </>
  );
}
