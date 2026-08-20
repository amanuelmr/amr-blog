"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import { Blog, PublicProfile } from "@/lib/types";
import { Avatar } from "./Avatar";
import { ArticleRow } from "./ArticleRow";
import { Button } from "./ui/Button";
import { Textarea } from "./ui/Field";
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
  const { user, updateProfile } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<PostsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

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

  function startEditBio() {
    setBioDraft(profile?.bio ?? "");
    setSaveError("");
    setEditing(true);
  }

  async function saveBio() {
    setSaving(true);
    setSaveError("");
    try {
      const updated = await updateProfile({ bio: bioDraft.trim() });
      setProfile((p) => (p ? { ...p, bio: updated.bio } : p));
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Could not save your bio.");
    } finally {
      setSaving(false);
    }
  }

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

          {editing ? (
            <div className="mt-3">
              <Textarea
                value={bioDraft}
                onChange={(e) => setBioDraft(e.target.value)}
                rows={3}
                maxLength={280}
                placeholder="Tell readers a bit about yourself…"
                aria-label="Bio"
              />
              {saveError && <p className="mt-1.5 text-sm text-red-500">{saveError}</p>}
              <div className="mt-2 flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={saveBio} loading={saving}>
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <>
              {profile.bio ? (
                <p className="mt-3 max-w-prose text-fg/90">{profile.bio}</p>
              ) : isOwnProfile ? (
                <p className="mt-3 text-sm text-muted">No bio yet.</p>
              ) : null}
              {isOwnProfile && (
                <button onClick={startEditBio} className="mt-2 text-sm text-accent hover:underline">
                  {profile.bio ? "Edit bio" : "Add a bio"}
                </button>
              )}
            </>
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
