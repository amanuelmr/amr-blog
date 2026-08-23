"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "./ThemeToggle";
import { Avatar } from "./Avatar";
import { LinkButton, Button } from "./ui/Button";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function Header() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  function search(query: string) {
    const trimmed = query.trim();
    router.push(trimmed ? `/?q=${encodeURIComponent(trimmed)}` : "/");
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    search(q);
    setMenuOpen(false);
  }

  // Close the sheet on Escape and on route-level clicks outside it, and return
  // focus to the control that opened it.
  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    }
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || toggleRef.current?.contains(target)) return;
      setMenuOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-5 sm:px-6">
        <Link
          href="/"
          onClick={close}
          className="flex items-baseline gap-0.5 font-display text-lg font-semibold tracking-tight"
        >
          AMR
          <span className="text-accent">.</span>
          <span className="font-sans text-sm font-normal tracking-normal text-muted">blog</span>
        </Link>

        {/* Desktop search */}
        <form onSubmit={onSearch} className="ml-3 hidden flex-1 items-center sm:flex" role="search">
          <div className="relative w-full max-w-xs">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search writing…"
              aria-label="Search writing"
              className="w-full rounded-md border border-border bg-card py-1.5 pl-9 pr-3 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />

          {/* Desktop actions */}
          {loading ? null : user ? (
            <>
              <LinkButton href="/bookmarks" variant="ghost" size="sm" className="hidden sm:inline-flex">
                Saved
              </LinkButton>
              <LinkButton href="/write/mine" variant="ghost" size="sm" className="hidden sm:inline-flex">
                Your posts
              </LinkButton>
              <LinkButton href="/write" size="sm" className="hidden sm:inline-flex">
                Write
              </LinkButton>
              <span className="hidden items-center gap-2 md:flex">
                <Avatar name={user.name} size={30} />
                <span className="max-w-[8rem] truncate text-sm text-fg">{user.name}</span>
              </span>
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => logout()}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <LinkButton href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                Log in
              </LinkButton>
              <LinkButton href="/register" size="sm" className="hidden sm:inline-flex">
                Sign up
              </LinkButton>
            </>
          )}

          {/* Mobile menu toggle — below `sm` this is the only way to reach
              search, the reading list, drafts and the composer. */}
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="grid h-11 w-11 place-items-center rounded-md border border-border bg-card text-fg transition-colors hover:bg-subtle sm:hidden"
          >
            {menuOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile sheet */}
      {menuOpen && (
        <div
          id="mobile-nav"
          ref={panelRef}
          className="animate-sheet-in border-t border-border bg-bg px-5 pb-5 pt-4 sm:hidden"
        >
          <form onSubmit={onSearch} role="search" className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search writing…"
              aria-label="Search writing"
              className="w-full rounded-md border border-border bg-card py-2.5 pl-9 pr-3 text-base text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
          </form>

          <nav className="mt-4 flex flex-col" aria-label="Main">
            <Link href="/" onClick={close} className="rule-top py-3 text-[0.95rem] text-fg">
              Writing
            </Link>
            {user ? (
              <>
                <Link href="/bookmarks" onClick={close} className="rule-top py-3 text-[0.95rem] text-fg">
                  Reading list
                </Link>
                <Link href="/write/mine" onClick={close} className="rule-top py-3 text-[0.95rem] text-fg">
                  Your posts
                </Link>
                <Link href={`/author/${user._id}`} onClick={close} className="rule-top py-3 text-[0.95rem] text-fg">
                  Your profile
                </Link>
                <div className="rule-top flex items-center justify-between gap-3 py-3">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={user.name} size={32} />
                    <span className="truncate text-sm text-muted">{user.name}</span>
                  </span>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => {
                      close();
                      logout();
                    }}
                  >
                    Log out
                  </Button>
                </div>
                <LinkButton href="/write" onClick={close} className="mt-4 w-full justify-center">
                  Write
                </LinkButton>
              </>
            ) : (
              <div className="rule-top mt-0 flex flex-col gap-2.5 pt-4">
                <LinkButton href="/login" variant="ghost" onClick={close} className="w-full justify-center">
                  Log in
                </LinkButton>
                <LinkButton href="/register" onClick={close} className="w-full justify-center">
                  Sign up
                </LinkButton>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
