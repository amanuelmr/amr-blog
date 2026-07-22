"use client";

import { useRef, ChangeEvent, ClipboardEvent, KeyboardEvent } from "react";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
  ariaLabel?: string;
}

// Segmented one-time-code input: auto-advance, backspace-to-previous, arrow
// nav, and paste-to-fill. No placeholder — empty boxes are the affordance.
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  autoFocus,
  ariaLabel = "Verification code",
}: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  function emit(next: string) {
    const clean = next.replace(/\D/g, "").slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
  }

  function focusAt(i: number) {
    const el = refs.current[Math.max(0, Math.min(length - 1, i))];
    el?.focus();
    el?.select();
  }

  function handleChange(i: number, e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      const next = digits.slice();
      next[i] = "";
      emit(next.join(""));
      return;
    }
    // Multiple chars (autofill / fast typing) → distribute from here.
    if (raw.length > 1) {
      const next = digits.slice();
      raw.slice(0, length - i).split("").forEach((c, k) => (next[i + k] = c));
      emit(next.join(""));
      focusAt(i + raw.length);
      return;
    }
    const next = digits.slice();
    next[i] = raw;
    emit(next.join(""));
    focusAt(i + 1);
  }

  function handleKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = digits.slice();
      if (digits[i]) {
        next[i] = "";
        emit(next.join(""));
      } else {
        next[i - 1] = "";
        emit(next.join(""));
        focusAt(i - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusAt(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusAt(i + 1);
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLDivElement>) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!text) return;
    e.preventDefault();
    emit(text);
    focusAt(text.length - 1);
  }

  return (
    <div className="flex gap-2 sm:gap-3" role="group" aria-label={ariaLabel} onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.currentTarget.select()}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          aria-label={`Digit ${i + 1} of ${length}`}
          autoFocus={autoFocus && i === 0}
          className="h-12 w-full min-w-0 rounded-lg border border-border bg-card text-center text-lg font-semibold text-fg transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      ))}
    </div>
  );
}
