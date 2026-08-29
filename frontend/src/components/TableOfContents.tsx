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

// Left position of the connector at each heading depth — h3 sits further
// right, matching the `pl-3` indent already on its <li>.
const DEPTH_X = { 2: 4, 3: 16 } as const;
// Half-length, in pixels, of the S-curve that eases the connector sideways
// when depth changes between one heading and the next.
const CURVE = 6;

interface Geometry {
  pathD: string;
  totalHeight: number;
  clipTop: number;
  clipBottom: number;
  dot: { x: number; y: number };
}

/**
 * Builds one continuous connector through every heading (shifting right for
 * h3s, eased with a short bezier at each depth change — never a plain
 * straight rail), then reports the pixel band covering the current
 * top-level section so the caller can clip the connector to just that band.
 */
function computeGeometry(
  headings: Heading[],
  items: Map<string, HTMLLIElement>,
  activeIndex: number
): Geometry | null {
  if (activeIndex < 0 || headings.length === 0) return null;
  const rects = headings.map((h) => {
    const el = items.get(h.id);
    return el ? { top: el.offsetTop, bottom: el.offsetTop + el.offsetHeight } : null;
  });
  if (rects.some((r) => !r)) return null;
  const bounds = rects as { top: number; bottom: number }[];

  let d = "";
  for (let i = 0; i < headings.length; i++) {
    const x = DEPTH_X[headings[i].level];
    if (i === 0) d += `M ${x} ${bounds[i].top} `;
    const isLast = i === headings.length - 1;
    const nextX = isLast ? x : DEPTH_X[headings[i + 1].level];
    if (isLast || nextX === x) {
      d += `L ${x} ${bounds[i].bottom} `;
    } else {
      const boundary = bounds[i].bottom;
      d += `L ${x} ${boundary - CURVE} `;
      d += `C ${x} ${boundary - CURVE / 2} ${nextX} ${boundary + CURVE / 2} ${nextX} ${boundary + CURVE} `;
    }
  }

  // The current top-level section: its own heading through every
  // subheading under it, not just the ones already scrolled past.
  let groupStart = activeIndex;
  for (let i = activeIndex; i >= 0; i--) {
    groupStart = i;
    if (headings[i].level === 2) break;
  }
  let groupEnd = headings.length - 1;
  for (let i = groupStart + 1; i < headings.length; i++) {
    if (headings[i].level === 2) {
      groupEnd = i - 1;
      break;
    }
  }

  const active = bounds[activeIndex];
  return {
    pathD: d,
    totalHeight: bounds[bounds.length - 1].bottom,
    clipTop: bounds[groupStart].top,
    clipBottom: bounds[groupEnd].bottom,
    dot: { x: DEPTH_X[headings[activeIndex].level], y: (active.top + active.bottom) / 2 },
  };
}

/**
 * `animated` swaps the old per-item static border for a curved connector
 * (never a plain straight rail) that only appears — via clip-path — across
 * the current top-level section, with a dot pinpointing the exact active
 * heading within it. Sections you haven't reached carry no line at all.
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
  const [geometry, setGeometry] = useState<Geometry | null>(null);

  const activeIndex = headings.findIndex((h) => h.id === activeId);
  let groupStartIndex = activeIndex;
  for (let i = activeIndex; i >= 0; i--) {
    groupStartIndex = i;
    if (headings[i].level === 2) break;
  }
  let groupEndIndex = headings.length - 1;
  for (let i = groupStartIndex + 1; i < headings.length; i++) {
    if (headings[i].level === 2) {
      groupEndIndex = i - 1;
      break;
    }
  }

  useLayoutEffect(() => {
    if (!animated) return;
    const measure = () => setGeometry(computeGeometry(headings, itemRefs.current, activeIndex));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [animated, activeIndex, headings]);

  return (
    <ol className={animated ? "relative flex flex-col text-[0.8125rem]" : "flex flex-col text-[0.8125rem]"}>
      {animated && geometry && (
        <>
          <svg
            aria-hidden="true"
            className="absolute left-0 top-0 overflow-visible transition-[clip-path] duration-300 ease-out"
            width={20}
            height={geometry.totalHeight}
            style={{
              clipPath: `inset(${geometry.clipTop}px 0 ${geometry.totalHeight - geometry.clipBottom}px 0)`,
            }}
          >
            <path d={geometry.pathD} stroke="rgb(var(--accent))" strokeWidth={1.5} fill="none" />
          </svg>
          <span
            aria-hidden="true"
            className="absolute h-[6px] w-[6px] rounded-full bg-accent transition-[top,left] duration-300 ease-out"
            style={{ top: geometry.dot.y - 3, left: geometry.dot.x - 3 }}
          />
        </>
      )}
      {headings.map((h, i) => {
        const inRange = animated && activeIndex >= 0 && i >= groupStartIndex && i <= groupEndIndex;
        return (
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
              style={inRange ? { color: "rgb(var(--accent))" } : undefined}
            >
              <span className="mr-2 font-mono text-[0.6875rem] tabular-nums text-faint">
                {String(i + 1).padStart(2, "0")}
              </span>
              {h.text}
            </a>
          </li>
        );
      })}
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
