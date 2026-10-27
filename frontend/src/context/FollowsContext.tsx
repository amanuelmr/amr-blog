"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "@/lib/api";
import { useAuth } from "./AuthContext";

interface FollowsContextValue {
  /** False until the signed-in user's follows have loaded. */
  ready: boolean;
  isFollowingUser: (id: string) => boolean;
  isFollowingTopic: (tag: string) => boolean;
  /** Toggle; resolves to the writer's new follower count. */
  toggleUser: (id: string) => Promise<number>;
  toggleTopic: (tag: string) => Promise<void>;
}

const FollowsContext = createContext<FollowsContextValue | null>(null);

/**
 * Who and what the signed-in reader follows, loaded once and shared, so
 * every follow button on a page knows its state without its own request.
 */
export function FollowsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [users, setUsers] = useState<Set<string>>(new Set());
  const [topics, setTopics] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUsers(new Set());
    setTopics(new Set());
    setReady(false);
    if (!user) return;
    let cancelled = false;
    api<{ users: string[]; topics: string[] }>("/auth/me/follows")
      .then((res) => {
        if (cancelled) return;
        setUsers(new Set(res.users));
        setTopics(new Set(res.topics));
        setReady(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggleUser = useCallback(async (id: string) => {
    const res = await api<{ following: boolean; followers: number }>(`/auth/users/${id}/follow`, {
      method: "POST",
      body: {},
    });
    setUsers((prev) => {
      const next = new Set(prev);
      if (res.following) next.add(id);
      else next.delete(id);
      return next;
    });
    return res.followers;
  }, []);

  const toggleTopic = useCallback(async (tag: string) => {
    const key = tag.toLowerCase();
    const res = await api<{ following: boolean }>(`/blogs/topics/${encodeURIComponent(key)}/follow`, {
      method: "POST",
      body: {},
    });
    setTopics((prev) => {
      const next = new Set(prev);
      if (res.following) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  return (
    <FollowsContext.Provider
      value={{
        ready,
        isFollowingUser: (id) => users.has(id),
        isFollowingTopic: (tag) => topics.has(tag.toLowerCase()),
        toggleUser,
        toggleTopic,
      }}
    >
      {children}
    </FollowsContext.Provider>
  );
}

export function useFollows(): FollowsContextValue {
  const ctx = useContext(FollowsContext);
  if (!ctx) throw new Error("useFollows must be used within a FollowsProvider");
  return ctx;
}
