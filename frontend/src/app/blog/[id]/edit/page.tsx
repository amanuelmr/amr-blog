"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import { Blog } from "@/lib/types";
import { RequireAuth } from "@/components/RequireAuth";
import { BlogForm } from "@/components/BlogForm";
import { Spinner, ErrorState } from "@/components/states";

function EditInner({ id }: { id: string }) {
  const { user } = useAuth();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setBlog(await api<Blog>(`/blogs/${id}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load the article.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="mx-auto max-w-3xl px-4"><Spinner /></div>;
  if (error || !blog)
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <ErrorState message={error || "Article not found."} onRetry={load} />
      </div>
    );

  if (!blog.author || blog.author._id !== user?._id) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="font-medium">You can only edit your own articles.</p>
        <Link href={`/blog/${id}`} className="mt-3 inline-block text-sm text-accent hover:underline">
          ← Back to the article
        </Link>
      </div>
    );
  }

  return <BlogForm mode="edit" blog={blog} />;
}

export default function EditPage({ params }: { params: { id: string } }) {
  return (
    <RequireAuth>
      <EditInner id={params.id} />
    </RequireAuth>
  );
}
