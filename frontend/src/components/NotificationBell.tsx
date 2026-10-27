"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";

const POLL_MS = 60_000;

/** Fired by the notifications page after marking everything read. */
export const NOTIFICATIONS_READ_EVENT = "amr:notifications-read";

/** Header bell with the unread count; polls while the tab is visible. */
export function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      if (document.visibilityState !== "visible") return;
      api<{ unread: number }>("/notifications/unread-count")
        .then((res) => !cancelled && setUnread(res.unread))
        .catch(() => {});
    };
    const reset = () => setUnread(0);
    check();
    const timer = window.setInterval(check, POLL_MS);
    document.addEventListener("visibilitychange", check);
    window.addEventListener(NOTIFICATIONS_READ_EVENT, reset);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener(NOTIFICATIONS_READ_EVENT, reset);
    };
  }, [pathname]);

  const label = unread > 0 ? `Notifications (${unread} unread)` : "Notifications";
  return (
    <Link
      href="/notifications"
      title={label}
      aria-label={label}
      className="relative grid h-9 w-9 place-items-center rounded-md text-muted transition-colors hover:bg-subtle hover:text-fg"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {unread > 0 && (
        <span className="absolute right-0.5 top-0.5 grid min-w-[1.1rem] place-items-center rounded-full bg-accent px-1 font-mono text-[0.625rem] font-bold leading-[1.1rem] text-accent-fg">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
