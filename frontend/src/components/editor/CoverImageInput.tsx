"use client";

import { useRef, useState, DragEvent } from "react";
import { ImageIcon } from "./EditorIcons";

const MAX_BYTES = 5 * 1024 * 1024; // matches backend 5MB limit

export function CoverImageInput({
  preview,
  onSelect,
  onRemove,
}: {
  preview: string | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  function accept(file?: File | null) {
    setError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Cover must be an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Cover image must be 5MB or smaller.");
      return;
    }
    onSelect(file);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    accept(e.dataTransfer.files?.[0]);
  }

  const hiddenInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => accept(e.target.files?.[0])}
    />
  );

  if (preview) {
    return (
      <div className="mb-8">
        {hiddenInput}
        <div
          className="group relative overflow-hidden rounded-2xl border border-border bg-subtle"
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Cover" className="max-h-[420px] w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-lg bg-white/95 px-4 py-2 text-sm font-medium text-stone-900 hover:bg-white"
            >
              Change cover
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="rounded-lg bg-black/50 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/40 hover:bg-black/70"
            >
              Remove
            </button>
          </div>
          {dragging && <div className="absolute inset-0 ring-2 ring-inset ring-accent" />}
        </div>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mb-8">
      {hiddenInput}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex aspect-[16/6] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition-colors ${
          dragging ? "border-accent bg-subtle" : "border-border hover:border-accent hover:bg-subtle"
        }`}
      >
        <span className="grid h-11 w-11 place-items-center rounded-full bg-subtle text-muted">
          <ImageIcon width={22} height={22} />
        </span>
        <span className="text-sm font-medium text-fg">Add a cover image</span>
        <span className="text-xs text-muted">Drag &amp; drop or click · JPG, PNG, GIF, WebP up to 5MB</span>
      </button>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
