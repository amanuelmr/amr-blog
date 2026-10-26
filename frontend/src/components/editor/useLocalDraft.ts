"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// What the composer keeps a local copy of. Cover images and publish
// settings are left out: an un-uploaded File can't be stored, and those
// are quick to set again.
export interface DraftFields {
  title: string;
  subtitle: string;
  content: string;
  tags: string[];
}

interface Stored extends DraftFields {
  savedAt: number;
}

const PREFIX = "amr_compose_";
const SAVE_DELAY_MS = 800;

function same(a: DraftFields, b: DraftFields): boolean {
  return (
    a.title === b.title &&
    a.subtitle === b.subtitle &&
    a.content === b.content &&
    a.tags.length === b.tags.length &&
    a.tags.every((t, i) => t === b.tags[i])
  );
}

function read(key: string): Stored | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

/**
 * Keeps an unsaved copy of the composer in localStorage so a closed tab,
 * crash or expired session doesn't lose work, and warns before leaving the
 * page with unsaved changes. `id` is the post being edited, or undefined
 * for a new one.
 *
 * Returns `recovered` (the copy found on load, if it differs from what was
 * saved on the server) for the form to restore — then `dismissRecovered`
 * after restoring it, or `discard` to throw it away — plus `isDirty`, and
 * `clear` to call once the post has been saved to the server.
 */
export function useLocalDraft(id: string | undefined, initial: DraftFields, current: DraftFields) {
  const key = `${PREFIX}${id ?? "new"}`;
  const [recovered, setRecovered] = useState<Stored | null>(null);
  // The baseline "saved" state; captured once so re-renders don't move it.
  const baseline = useRef(initial);
  const cleared = useRef(false);
  const isDirty = !same(current, baseline.current);

  // Offer a stored copy once, on mount.
  useEffect(() => {
    const stored = read(key);
    if (stored && !same(stored, baseline.current)) setRecovered(stored);
  }, [key]);

  // Debounced write while there are unsaved changes; drop the copy when the
  // form is back to its saved state. Hold off while a recovered copy is
  // still on offer, or the untouched form would delete it before the
  // writer chooses.
  useEffect(() => {
    if (cleared.current || recovered) return;
    const t = setTimeout(() => {
      try {
        if (isDirty) localStorage.setItem(key, JSON.stringify({ ...current, savedAt: Date.now() }));
        else localStorage.removeItem(key);
      } catch {
        // Storage full or blocked — the copy is a convenience, not a guarantee.
      }
    }, SAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [key, current, isDirty, recovered]);

  // Native "leave site?" prompt while there's unsaved work.
  useEffect(() => {
    if (!isDirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (cleared.current) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const clear = useCallback(() => {
    cleared.current = true;
    setRecovered(null);
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }, [key]);

  const dismissRecovered = useCallback(() => setRecovered(null), []);

  const discard = useCallback(() => {
    setRecovered(null);
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }, [key]);

  return { recovered, dismissRecovered, discard, isDirty, clear };
}
