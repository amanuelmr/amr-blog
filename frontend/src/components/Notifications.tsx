"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { AppNotification } from "@/lib/types";
import { blogHref, relativeTime } from "@/lib/format";
import { RequireAuth } from "./RequireAuth";
import { Avatar } from "./Avatar";
import { Pagination } from "./Pagination";
import { EmptyState, ErrorState, Spinner } from "./states";
import { NOTIFICATIONS_READ_EVENT } from "./NotificationBell";

const PAGE_SIZE = 20;

interface NotificationsResponse {
  notifications: AppNotification[];
  total: number;
  unread: number;
  page: number;
  totalPages: number;
}

const VERBS: Record<AppNotification["type"], string> = {
  follow: "started following you",
  like: "liked",
  clap: "applauded",
  comment: "commented on",
  reply: "replied to your comment on",
  new_post: "published",
};

function Row({ n }: { n: AppNotification }) {
  const actor = n.actor?.name ?? "Someone";
  // A follow points at who followed; everything else at the post (the
  // comment section, for comments and replies).
  const href = n.type === "follow" || !n.blog
    ? n.actor ? `/author/${n.actor._id}` : null
    : `${blogHref(n.blog)}${n.type === "comment" || n.type === "reply" ? "#comments" : ""}`;

  const body = (
    <div className="flex items-start gap-3 py-4">
      <Avatar name={n.actor?.name} src={n.actor?.avatarUrl} size={36} />
      <div className="min-w-0 flex-1">
        <p className="text-[0.9375rem] leading-snug text-fg">
          <span className="font-semibold">{actor}</span> {VERBS[n.type]}
          {n.blog && n.type !== "follow" && <> <span className="font-semibold">{n.blog.title}</span></>}
        </p>
        <p className="mt-1 text-xs text-muted">{relativeTime(n.createdAt)}</p>
      </div>
      {!n.read && <span className="mt-2 h-2 w-2 flex-none rounded-full bg-accent" aria-label="Unread" />}
    </div>
  );

  return (
    <li className={`rule-top first:border-t-0 ${n.read ? "" : "bg-accent/5"}`}>
      {href ? (
        <Link href={href} className="block px-3 transition-colors hover:bg-subtle">{body}</Link>
      ) : (
        <div className="px-3">{body}</div>
      )}
    </li>
  );
}

function NotificationsInner({ page }: { page: number }) {
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api<NotificationsResponse>(`/notifications?page=${page}&limit=${PAGE_SIZE}`);
      setData(res);
      // Opening the page counts as seeing them: the list keeps its unread
      // dots for this visit, while the bell clears.
      if (res.unread > 0) {
        await api("/notifications/read-all", { method: "POST", body: {} });
        window.dispatchEvent(new Event(NOTIFICATIONS_READ_EVENT));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load notifications.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-2xl px-5 py-12 sm:px-6">
      <h1 className="mb-8 font-display text-3xl font-bold tracking-tight">Notifications</h1>
      {loading ? (
        <Spinner label="Loading…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !data || data.notifications.length === 0 ? (
        <EmptyState title="Nothing yet" hint="Follows, likes, comments and replies on your writing show up here." />
      ) : (
        <>
          <ul className="overflow-hidden rounded-md border border-border">
            {data.notifications.map((n) => (
              <Row key={n._id} n={n} />
            ))}
          </ul>
          <Pagination page={data.page} totalPages={data.totalPages} makeHref={(p) => `/notifications?page=${p}`} />
        </>
      )}
    </div>
  );
}

export function Notifications({ page }: { page: number }) {
  return (
    <RequireAuth>
      <NotificationsInner page={page} />
    </RequireAuth>
  );
}
