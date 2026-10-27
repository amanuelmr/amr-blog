"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useFollows } from "@/context/FollowsContext";

const base = "inline-flex items-center rounded-full border font-medium transition-colors disabled:opacity-50";
const sizes = { sm: "px-3 py-1 text-xs", md: "px-4 py-1.5 text-sm" };

function classes(on: boolean, size: keyof typeof sizes) {
  return `${base} ${sizes[size]} ${
    on ? "border-border bg-card text-muted hover:text-fg" : "border-accent bg-accent text-accent-fg hover:opacity-90"
  }`;
}

/**
 * Follow / Following toggle for a writer. Hidden on your own profile and
 * bylines; signed-out readers are sent to log in.
 */
export function FollowButton({
  userId,
  size = "md",
  onFollowersChange,
}: {
  userId: string;
  size?: keyof typeof sizes;
  onFollowersChange?: (followers: number) => void;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const { isFollowingUser, toggleUser } = useFollows();
  const [busy, setBusy] = useState(false);

  if (user?._id === userId) return null;
  const following = isFollowingUser(userId);

  async function onClick() {
    if (!user) {
      router.push("/login");
      return;
    }
    setBusy(true);
    try {
      onFollowersChange?.(await toggleUser(userId));
    } catch {
      // leave the state as it was
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={onClick} disabled={busy} aria-pressed={following} className={classes(following, size)}>
      {following ? "Following" : "Follow"}
    </button>
  );
}

/** Follow / Following toggle for a topic. */
export function FollowTopicButton({ tag, size = "md" }: { tag: string; size?: keyof typeof sizes }) {
  const { user } = useAuth();
  const router = useRouter();
  const { isFollowingTopic, toggleTopic } = useFollows();
  const [busy, setBusy] = useState(false);
  const following = isFollowingTopic(tag);

  async function onClick() {
    if (!user) {
      router.push("/login");
      return;
    }
    setBusy(true);
    try {
      await toggleTopic(tag);
    } catch {
      // leave the state as it was
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={onClick} disabled={busy} aria-pressed={following} className={classes(following, size)}>
      {following ? "Following topic" : "Follow topic"}
    </button>
  );
}
