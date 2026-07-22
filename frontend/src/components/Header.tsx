"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "./ThemeToggle";
import { Avatar } from "./Avatar";
import { LinkButton, Button } from "./ui/Button";

export function Header() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [q, setQ] = useState("");

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/?q=${encodeURIComponent(query)}` : "/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-baseline gap-1 text-lg font-bold tracking-tight">
          AMR
          <span className="text-accent">.</span>
          <span className="font-normal text-muted">blog</span>
        </Link>

        <form onSubmit={onSearch} className="ml-2 hidden flex-1 items-center sm:flex" role="search">
          <div className="relative w-full max-w-sm">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search articles…"
              aria-label="Search articles"
              className="w-full rounded-lg border border-border bg-subtle py-2 pl-9 pr-3 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {loading ? null : user ? (
            <>
              <LinkButton href="/write" size="sm" className="hidden sm:inline-flex">
                Write
              </LinkButton>
              <span className="hidden items-center gap-2 md:flex">
                <Avatar name={user.name} size={32} />
                <span className="max-w-[8rem] truncate text-sm text-fg">{user.name}</span>
              </span>
              <Button variant="ghost" size="sm" onClick={() => logout()}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <LinkButton href="/login" variant="ghost" size="sm">
                Log in
              </LinkButton>
              <LinkButton href="/register" size="sm">
                Sign up
              </LinkButton>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
