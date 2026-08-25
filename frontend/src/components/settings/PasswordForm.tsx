"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Label, Input, FieldError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { fieldErrorsFrom, formErrorFrom } from "@/lib/fieldErrors";

const MIN_LENGTH = 8;

/**
 * Changing a password while signed in. The endpoint has existed since the
 * beginning and had no interface at all — the only way to change a password
 * was to log out and go through the emailed reset code.
 */
export function PasswordForm() {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const tooShort = next.length > 0 && next.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && next !== confirm;
  const sameAsCurrent = next.length > 0 && next === current;
  const canSubmit =
    !!current && next.length >= MIN_LENGTH && next === confirm && !sameAsCurrent && !saving;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setErrors({});
    setFormError("");
    setDone(false);
    try {
      await changePassword(current, next);
      // Never leave a password sitting in a field after it has been used.
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(true);
      window.setTimeout(() => setDone(false), 6000);
    } catch (err) {
      const fieldErrors = fieldErrorsFrom(err);
      setErrors({
        current: fieldErrors.oldPassword,
        next: fieldErrors.newPassword,
      });
      setFormError(formErrorFrom(err, "Could not change your password."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div>
        <Label htmlFor="current-password">Current password</Label>
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          aria-invalid={!!errors.current}
        />
        <FieldError>{errors.current}</FieldError>
      </div>

      <div>
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          aria-invalid={!!errors.next || tooShort || sameAsCurrent}
          aria-describedby="new-password-help"
        />
        <FieldError>
          {errors.next ||
            (tooShort ? `Use at least ${MIN_LENGTH} characters.` : "") ||
            (sameAsCurrent ? "Choose a password you are not already using." : "")}
        </FieldError>
        <p id="new-password-help" className="mt-1.5 text-meta text-muted">
          At least {MIN_LENGTH} characters.
        </p>
      </div>

      <div>
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={mismatch}
        />
        <FieldError>{mismatch ? "These two do not match." : ""}</FieldError>
      </div>

      {formError && <p className="text-sm text-red-500">{formError}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" loading={saving} disabled={!canSubmit}>
          Change password
        </Button>
        {done && (
          <span className="text-meta text-accent" role="status">
            Password changed. A confirmation is on its way to your inbox.
          </span>
        )}
        <Link
          href="/forgot-password"
          className="ml-auto text-meta text-muted underline-offset-2 hover:text-fg hover:underline"
        >
          Forgotten your current one?
        </Link>
      </div>
    </form>
  );
}
