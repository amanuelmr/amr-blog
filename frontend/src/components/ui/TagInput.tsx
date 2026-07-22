"use client";

import { useState, KeyboardEvent } from "react";

export function TagInput({
  value,
  onChange,
  max = 5,
  placeholder = "Add a tag…",
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  max?: number;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function addTag(raw: string) {
    const tag = raw.trim().replace(/^#/, "");
    if (!tag) return;
    if (value.length >= max) return;
    if (value.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...value, tag]);
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-subtle px-3 py-1 text-sm text-fg"
        >
          <span className="text-muted">#</span>
          {tag}
          <button
            type="button"
            aria-label={`Remove ${tag}`}
            onClick={() => onChange(value.filter((t) => t !== tag))}
            className="ml-0.5 text-muted transition-colors hover:text-red-500"
          >
            ×
          </button>
        </span>
      ))}
      {value.length < max && (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => addTag(draft)}
          placeholder={value.length ? "Add another…" : placeholder}
          aria-label="Add a tag"
          className="min-w-[8rem] flex-1 border-0 bg-transparent py-1 text-sm text-fg placeholder:text-muted focus:outline-none focus:ring-0"
        />
      )}
    </div>
  );
}
