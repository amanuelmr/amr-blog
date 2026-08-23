"use client";

import { useEffect, useState } from "react";

/**
 * A hairline at the very top showing how far through the article you are.
 * Measured against the article element, not the document, so the header and
 * comments don't count as "reading".
 */
export function ReadingProgress({ targetRef }: { targetRef: React.RefObject<HTMLElement> }) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = targetRef.current;
      if (!el) return;
      const start = el.offsetTop;
      const distance = el.offsetHeight - window.innerHeight;
      if (distance <= 0) {
        setPct(0);
        return;
      }
      const scrolled = (window.scrollY - start) / distance;
      setPct(Math.min(100, Math.max(0, scrolled * 100)));
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [targetRef]);

  return (
    <div
      className="reading-progress"
      style={{ width: `${pct}%` }}
      role="progressbar"
      aria-label="Reading progress"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    />
  );
}
