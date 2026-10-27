"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

/** Get (or stop getting) a writer's new posts by email. */
export function SubscribeButton({ userId, initialSubscribed }: { userId: string; initialSubscribed: boolean }) {
  const { user } = useAuth();
  const router = useRouter();
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [busy, setBusy] = useState(false);

  if (user?._id === userId) return null;

  async function toggle() {
    if (!user) {
      router.push("/login");
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ subscribed: boolean }>(`/auth/users/${userId}/subscribe`, { method: "POST", body: {} });
      setSubscribed(res.subscribed);
    } catch {
      // leave the state as it was
    } finally {
      setBusy(false);
    }
  }

  const label = subscribed ? "Stop emailing me new posts" : "Email me new posts";
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={subscribed}
      title={label}
      aria-label={label}
      className={`inline-grid h-7 w-7 place-items-center rounded-full border transition-colors disabled:opacity-50 ${
        subscribed ? "border-accent bg-accent/10 text-accent" : "border-border bg-card text-muted hover:text-fg"
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
        {subscribed && <path d="M16 3.5 17.5 5 21 1.5" />}
      </svg>
    </button>
  );
}
