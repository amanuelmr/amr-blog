"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Heading } from "@/lib/toc";

/** Tracks which heading the reading line has most recently passed. */
function useActiveHeading(headings: Heading[]): string {
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

  return activeId;
}

/**
 * `animated` swaps the old per-item static border for one continuous rail
 * with a single marker that slides to the active heading's position — a
 * timeline, not a row of borders switching on and off.
 */
function TocList({
  headings,
  activeId,
  animated,
}: {
  headings: Heading[];
  activeId: string;
  animated?: boolean;
}) {
  const itemRefs = useRef(new Map<string, HTMLLIElement>());
  const [marker, setMarker] = useState<{ top: number; height: number } | null>(null);

  useLayoutEffect(() => {
    if (!animated) return;
    const measure = () => {
      const el = activeId ? itemRefs.current.get(activeId) : null;
      setMarker(el ? { top: el.offsetTop, height: el.offsetHeight } : null);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [animated, activeId, headings]);

  return (
    <ol className={animated ? "relative flex flex-col text-[0.8125rem]" : "flex flex-col text-[0.8125rem]"}>
      {animated && (
        <>
          <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-px bg-rule" />
          {marker && (
            <span
              aria-hidden="true"
              className="absolute left-0 w-[3px] rounded-full bg-accent transition-[top,height] duration-300 ease-out"
              style={{ top: marker.top, height: marker.height }}
            />
          )}
        </>
      )}
      {headings.map((h, i) => (
        <li
          key={h.id}
          ref={
            animated
              ? (el) => {
                  if (el) itemRefs.current.set(h.id, el);
                  else itemRefs.current.delete(h.id);
                }
              : undefined
          }
          className={h.level === 3 ? "pl-3" : undefined}
        >
          <a
            href={`#${h.id}`}
            aria-current={activeId === h.id ? "true" : undefined}
            className={animated ? "toc-link toc-link--rail" : "toc-link"}
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
}

/**
 * Collapsed disclosure for narrow screens, placed inline in the article flow
 * so it never pushes content down when open.
 */
export function TableOfContentsMobile({ headings }: { headings: Heading[] }) {
  const activeId = useActiveHeading(headings);
  if (headings.length < 2) return null;

  return (
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
        <TocList headings={headings} activeId={activeId} />
      </nav>
    </details>
  );
}

/**
 * The wide-screen presentation: a genuine third grid column (not a floated
 * overlay), so it reserves its own space instead of guessing how much margin
 * is free next to the article.
 */
export function TableOfContentsDesktop({ headings }: { headings: Heading[] }) {
  const activeId = useActiveHeading(headings);
  if (headings.length < 2) return null;

  return (
    <nav aria-label="Table of contents" className="hidden lg:block">
      <div className="sticky top-24">
        <p className="label mb-3 text-faint">On this page</p>
        <TocList headings={headings} activeId={activeId} animated />
      </div>
    </nav>
  );
}
