"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Blog, BlogStatus } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/AuthCard";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { CoverImageInput } from "@/components/editor/CoverImageInput";
import { TagInput } from "@/components/ui/TagInput";
import { stripHtml, contentToHtml, blogHref, publishState } from "@/lib/format";
import { uploadToCloudinary } from "@/lib/uploadToCloudinary";

type Action = "draft" | "publish" | "schedule";

// datetime-local wants "YYYY-MM-DDTHH:mm" in local time (no timezone).
function toDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BlogForm({ mode, blog }: { mode: "create" | "edit"; blog?: Blog }) {
  const router = useRouter();
  const [title, setTitle] = useState(blog?.title ?? "");
  // Editor works in HTML; legacy plain-text posts are normalized on load.
  const [content, setContent] = useState(blog ? contentToHtml(blog.content) : "");
  const [tags, setTags] = useState<string[]>(blog?.tags ?? []);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(blog?.titleBackgroundImageUrl ?? null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  const wasAlreadyLive = !!blog && publishState(blog) === "live";
  const [action, setAction] = useState<Action>(() => {
    if (!blog) return "publish"; // create: matches the previous always-publish behavior
    if (blog.status === "draft") return "draft";
    return publishState(blog) === "scheduled" ? "schedule" : "publish";
  });
  const [scheduledFor, setScheduledFor] = useState<string>(() =>
    blog && publishState(blog) === "scheduled" && blog.publishedAt ? toDateTimeLocal(blog.publishedAt) : ""
  );

  // Auto-grow the borderless title as it wraps.
  useEffect(() => {
    const el = titleRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [title]);

  function selectCover(f: File) {
    setError("");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }
  function removeCover() {
    setFile(null);
    setPreview(null);
  }

  // A future publishedAt schedules the post; omitting it on "publish" only
  // sends "now" the first time (wasAlreadyLive), so re-saving a live post
  // never resets its original publish date.
  function statusPayload(): { status: BlogStatus; publishedAt?: string | null } {
    if (action === "draft") return { status: "draft", publishedAt: null };
    if (action === "schedule") return { status: "published", publishedAt: new Date(scheduledFor).toISOString() };
    return wasAlreadyLive ? { status: "published" } : { status: "published", publishedAt: new Date().toISOString() };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !stripHtml(content).trim()) {
      setError("A title and some content are required.");
      return;
    }
    if (action === "schedule") {
      if (!scheduledFor) {
        setError("Pick a date and time to schedule for, or choose Publish now.");
        return;
      }
      if (new Date(scheduledFor).getTime() <= Date.now()) {
        setError("Scheduled time must be in the future — pick a later time, or choose Publish now.");
        return;
      }
    }
    setSaving(true);
    setError("");

    try {
      // A new cover is uploaded straight to Cloudinary; otherwise keep the
      // existing URL (edit) or null (no cover / removed).
      let coverUrl: string | null = file ? null : preview;
      if (file) coverUrl = await uploadToCloudinary(file, "cover");

      const res = await api<{ blog: Blog }>(
        mode === "create" ? "/blogs/create" : `/blogs/${blog!._id}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          body: {
            title: title.trim(),
            content,
            tags,
            titleBackgroundImageUrl: coverUrl,
            ...statusPayload(),
          },
        }
      );
      router.push(res.blog.status === "draft" ? "/write/mine" : blogHref(res.blog));
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the article.");
      setSaving(false);
    }
  }

  const submitLabel =
    action === "draft" ? "Save draft" : action === "schedule" ? "Schedule" : wasAlreadyLive ? "Save changes" : "Publish";

  return (
    <form onSubmit={onSubmit}>
      {/* Sticky composer bar */}
      <div className="sticky top-16 z-30 border-b border-border bg-bg/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg"
          >
            ← Back
          </button>
          <div className="flex items-center gap-2">
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as Action)}
              aria-label="Publish action"
              className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              <option value="draft">Draft</option>
              <option value="publish">{wasAlreadyLive ? "Published" : "Publish now"}</option>
              <option value="schedule">Schedule…</option>
            </select>
            {action === "schedule" && (
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                aria-label="Scheduled publish time"
                className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            )}
            <Button type="submit" size="sm" loading={saving}>
              {submitLabel}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-10">
        {error && (
          <div className="mb-6">
            <FormAlert kind="error">{error}</FormAlert>
          </div>
        )}

        <CoverImageInput preview={preview} onSelect={selectCover} onRemove={removeCover} />

        <textarea
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          rows={1}
          maxLength={300}
          aria-label="Title"
          placeholder="Title"
          className="mb-4 w-full resize-none overflow-hidden border-0 bg-transparent p-0 font-serif text-4xl font-bold leading-tight tracking-tight text-fg placeholder:text-muted/40 focus:outline-none focus:ring-0 sm:text-5xl"
        />

        <RichTextEditor value={content} onChange={setContent} />

        <div className="mt-12 border-t border-border pt-6">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">Tags</p>
          <TagInput value={tags} onChange={setTags} />
        </div>
      </div>
    </form>
  );
}
