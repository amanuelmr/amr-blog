"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { Blog } from "@/lib/types";
import { Label, Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/AuthCard";

const MAX_BYTES = 5 * 1024 * 1024; // matches backend 5MB limit

export function BlogForm({ mode, blog }: { mode: "create" | "edit"; blog?: Blog }) {
  const router = useRouter();
  const [title, setTitle] = useState(blog?.title ?? "");
  const [content, setContent] = useState(blog?.content ?? "");
  const [tags, setTags] = useState(blog?.tags?.join(", ") ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(blog?.titleBackgroundImageUrl ?? null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setError("");
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Cover must be an image file.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("Cover image must be 5MB or smaller.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError("Title and content are required.");
      return;
    }
    setSaving(true);
    setError("");
    const form = new FormData();
    form.append("title", title.trim());
    form.append("content", content);
    form.append("tags", tags);
    if (file) form.append("titleBackgroundImage", file);

    try {
      const res = await api<{ blog: Blog }>(
        mode === "create" ? "/blogs/create" : `/blogs/${blog!._id}`,
        { method: mode === "create" ? "POST" : "PUT", form }
      );
      router.push(`/blog/${res.blog._id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the article.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">
        {mode === "create" ? "Write an article" : "Edit article"}
      </h1>

      {error && <FormAlert kind="error">{error}</FormAlert>}

      <div className="flex flex-col gap-6">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="A clear, specific title" className="text-lg" required maxLength={300} />
        </div>

        <div>
          <Label>Cover image <span className="font-normal text-muted">(optional)</span></Label>
          <div className="mt-1 flex items-center gap-4">
            <div className="relative h-24 w-40 flex-none overflow-hidden rounded-lg border border-border bg-subtle">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Cover preview" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-xs text-muted">No image</div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" />
              <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                {preview ? "Replace image" : "Upload image"}
              </Button>
              {preview && (
                <button type="button" onClick={() => { setFile(null); setPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="text-left text-xs text-muted hover:text-red-500">
                  Remove
                </button>
              )}
            </div>
          </div>
          <p className="mt-1.5 text-xs text-muted">JPG, PNG, GIF or WebP · up to 5MB.</p>
        </div>

        <div>
          <Label htmlFor="content">Content</Label>
          <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)}
            placeholder="Write your article… (blank lines start new paragraphs)" rows={16} required />
        </div>

        <div>
          <Label htmlFor="tags">Tags <span className="font-normal text-muted">(comma-separated)</span></Label>
          <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)}
            placeholder="backend, node, systems" />
        </div>

        <div className="flex gap-3">
          <Button type="submit" loading={saving}>
            {mode === "create" ? "Publish" : "Save changes"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}
