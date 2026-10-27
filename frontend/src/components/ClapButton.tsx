"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

const MAX_CLAPS = 50;
// Clicks in a burst are sent together once the reader pauses.
const SEND_DELAY_MS = 600;

interface ClapResponse {
  clapCount: number;
  mine: number;
}

/**
 * Applause: each click adds a clap (up to 50 per reader), shown at once and
 * sent in one request when the clicking stops. The author can't applaud
 * their own post; a signed-out reader is sent to log in.
 */
export function ClapButton({
  blogId,
  initialCount,
  initialMine,
  isOwner,
}: {
  blogId: string;
  initialCount: number;
  initialMine: number;
  isOwner: boolean;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [mine, setMine] = useState(initialMine);
  const pending = useRef(0);
  const timer = useRef<number | null>(null);
  // The server's last confirmed state, to roll back to if a send fails.
  const confirmed = useRef({ count: initialCount, mine: initialMine });

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  async function flush() {
    const add = pending.current;
    pending.current = 0;
    timer.current = null;
    if (add === 0) return;
    try {
      const res = await api<ClapResponse>(`/blogs/${blogId}/clap`, { method: "POST", body: { count: add } });
      confirmed.current = { count: res.clapCount, mine: res.mine };
      // Clicks made while this request was in flight are still pending.
      setCount(res.clapCount + pending.current);
      setMine(res.mine + pending.current);
    } catch {
      setCount(confirmed.current.count);
      setMine(confirmed.current.mine);
    }
  }

  function clap() {
    if (!user) {
      router.push("/login");
      return;
    }
    if (isOwner || mine >= MAX_CLAPS) return;
    pending.current += 1;
    setCount((c) => c + 1);
    setMine((m) => m + 1);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, SEND_DELAY_MS);
  }

  async function undo() {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    pending.current = 0;
    try {
      const res = await api<ClapResponse>(`/blogs/${blogId}/clap`, { method: "DELETE" });
      confirmed.current = { count: res.clapCount, mine: 0 };
      setCount(res.clapCount);
      setMine(0);
    } catch {
      setCount(confirmed.current.count);
      setMine(confirmed.current.mine);
    }
  }

  const title = isOwner
    ? "Readers' applause"
    : mine >= MAX_CLAPS
      ? `You applauded ${MAX_CLAPS} times — the most you can`
      : "Applaud (click more for more)";

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={clap}
        disabled={isOwner}
        title={title}
        aria-label={`${title}. ${count} claps`}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-default ${
          mine > 0 ? "border-accent bg-accent/10 text-accent" : "border-border bg-card text-fg hover:bg-subtle"
        }`}
      >
        {/* Outline only — filled, the hand reads as a blob. Applause shows
            through the accent color instead. */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth={mine > 0 ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 11.5 4.7 9.2a1.5 1.5 0 0 1 2.1-2.1l4.4 4.4" />
          <path d="m9.6 8.9-2.2-2.2a1.5 1.5 0 0 1 2.1-2.1l5.3 5.3" />
          <path d="m12.6 7.4-.8-.8a1.5 1.5 0 0 1 2.1-2.1l4.3 4.3a6 6 0 0 1 0 8.5l-.6.6a6 6 0 0 1-8.5 0L5 13.7a1.5 1.5 0 0 1 2.1-2.1l2 2" />
        </svg>
        <span className="tabular-nums">{count.toLocaleString()}</span>
      </button>
      {mine > 0 && !isOwner && (
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span className="tabular-nums">+{mine}</span>
          <button onClick={undo} className="underline-offset-2 hover:text-fg hover:underline" title="Take back your applause">
            Undo
          </button>
        </span>
      )}
    </span>
  );
}
