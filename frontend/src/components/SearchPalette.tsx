"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Blog } from "@/lib/types";
import { blogHref } from "@/lib/format";

interface SearchResponse {
  blogs: Blog[];
  total: number;
}

const DEBOUNCE_MS = 200;
const RESULT_LIMIT = 8;

/**
 * A ⌘K / Ctrl+K command palette for instant search, layered on top of the
 * header's plain search input rather than replacing it — that input still
 * works (and still works with JS disabled, since it's a real form).
 */
export function SearchPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setError("");
    setActive(0);
    triggerRef.current?.focus();
  }, []);

  // Global shortcut: works from anywhere on the site, not just the header.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        triggerRef.current = document.activeElement as HTMLElement;
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Debounced live search — cancels the in-flight request when the query
  // changes again before it resolves.
  useEffect(() => {
    if (!open) return;
    clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      abortRef.current?.abort();
      setResults([]);
      setLoading(false);
      setError("");
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      api<SearchResponse>(`/blogs/search?query=${encodeURIComponent(q)}&limit=${RESULT_LIMIT}`, {
        signal: controller.signal,
      })
        .then((res) => {
          setResults(res.blogs ?? []);
          setActive(0);
          setError("");
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError(err instanceof ApiError ? err.message : "Couldn't search right now.");
        })
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [query, open]);

  function go(blog: Blog) {
    close();
    router.push(blogHref(blog));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[active]) go(results[active]);
      else if (query.trim()) {
        close();
        router.push(`/?q=${encodeURIComponent(query.trim())}`);
      }
    }
  }

  if (!open) return null;

  const activeId = results[active] ? `search-result-${results[active]._id}` : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-fg/40 px-4 pt-[12vh]"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-lg border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <span className="label flex-none text-faint">Search</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type to search…"
            aria-label="Search writing"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="search-results"
            aria-activedescendant={activeId}
            autoComplete="off"
            className="w-full flex-1 bg-transparent text-[0.9375rem] text-fg placeholder:text-muted focus:outline-none"
          />
        </div>

        <div id="search-results" role="listbox" aria-label="Search results" className="max-h-80 overflow-y-auto">
          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-muted">Searching…</p>
          ) : error ? (
            <p className="px-4 py-8 text-center text-sm text-red-500">{error}</p>
          ) : !query.trim() ? (
            <p className="px-4 py-8 text-center text-sm text-muted">Start typing to search the journal.</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">No matches.</p>
          ) : (
            results.map((b, i) => (
              <button
                key={b._id}
                id={`search-result-${b._id}`}
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(b)}
                className={`block w-full px-4 py-3 text-left transition-colors ${i === active ? "bg-subtle" : ""}`}
              >
                <p className="text-[0.9375rem] font-semibold text-fg">{b.title}</p>
                {b.tags?.length > 0 && (
                  <p className="mt-0.5 font-mono text-[0.75rem] lowercase text-muted">
                    {b.tags.slice(0, 2).join(" · ")}
                  </p>
                )}
              </button>
            ))
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-border px-4 py-2 font-mono text-[0.6875rem] uppercase tracking-wide text-faint">
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}
