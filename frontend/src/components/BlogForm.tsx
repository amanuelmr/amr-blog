"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Blog } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/AuthCard";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { CoverImageInput } from "@/components/editor/CoverImageInput";
import { TagInput } from "@/components/ui/TagInput";
import { stripHtml, contentToHtml, blogHref } from "@/lib/format";
import { uploadToCloudinary } from "@/lib/uploadToCloudinary";

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !stripHtml(content).trim()) {
      setError("A title and some content are required to publish.");
      return;
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
          },
        }
      );
      router.push(blogHref(res.blog));
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the article.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {/* Sticky composer bar */}
      <div className="sticky top-16 z-30 border-b border-border bg-bg/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg"
          >
            ← Back
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted">
              {mode === "create" ? "Draft" : "Editing"}
            </span>
            <Button type="submit" size="sm" loading={saving}>
              {mode === "create" ? "Publish" : "Save changes"}
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
