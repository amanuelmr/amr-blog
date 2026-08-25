"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import { Blog, PublicProfile } from "@/lib/types";
import { Avatar } from "./Avatar";
import { ArticleRow } from "./ArticleRow";
import { Spinner, EmptyState, ErrorState } from "./states";
import { Pagination } from "./Pagination";
import { formatDate } from "@/lib/format";

const PAGE_SIZE = 10;

interface PostsResponse {
  blogs: Blog[];
  total: number;
  page: number;
  totalPages: number;
}

export function AuthorProfile({ id, page }: { id: string; page: number }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<PostsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [profileRes, postsRes] = await Promise.all([
        api<PublicProfile>(`/auth/users/${id}`),
        api<PostsResponse>(`/blogs?author=${id}&page=${page}&limit=${PAGE_SIZE}`),
      ]);
      setProfile(profileRes);
      setPosts(postsRes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load this profile.");
    } finally {
      setLoading(false);
    }
  }, [id, page]);

  useEffect(() => {
    load();
  }, [load]);

  const isOwnProfile = !!user && user._id === id;

  if (loading) return <div className="mx-auto max-w-3xl px-4 py-10"><Spinner label="Loading profile…" /></div>;
  if (error || !profile)
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <ErrorState message={error || "This profile doesn't exist."} onRetry={load} />
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="flex items-start gap-5">
        <Avatar name={profile.name} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-2xl font-bold tracking-tight">{profile.name}</h1>
          <p className="mt-0.5 text-sm text-muted">Joined {formatDate(profile.createdAt)}</p>

          {profile.bio ? (
            <p className="mt-3 max-w-prose text-fg/90">{profile.bio}</p>
          ) : isOwnProfile ? (
            <p className="mt-3 text-sm text-muted">No bio yet.</p>
          ) : null}
          {isOwnProfile && (
            <Link href="/settings" className="mt-2 inline-block text-sm text-accent hover:underline">
              {profile.bio ? "Edit profile" : "Add a bio"}
            </Link>
          )}
        </div>
      </div>

      <div className="mt-12 border-t border-border pt-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
          {posts?.total ?? 0} article{(posts?.total ?? 0) === 1 ? "" : "s"}
        </h2>
        {!posts || posts.blogs.length === 0 ? (
          <EmptyState title="No published articles yet" />
        ) : (
          <>
            <div>
              {posts.blogs.map((b, i) => (
                <ArticleRow key={b._id} blog={b} index={i} />
              ))}
            </div>
            <Pagination page={posts.page} totalPages={posts.totalPages} makeHref={(p) => `/author/${id}?page=${p}`} />
          </>
        )}
      </div>

      <div className="mt-8 text-center">
        <Link href="/" className="text-sm text-accent hover:underline">← Back to home</Link>
      </div>
    </div>
  );
}
