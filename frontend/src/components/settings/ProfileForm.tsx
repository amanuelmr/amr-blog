"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Label, Input, Textarea, FieldError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/Avatar";
import { fieldErrorsFrom, formErrorFrom } from "@/lib/fieldErrors";

const BIO_MAX = 280;
const NAME_MIN = 3;

/**
 * Name and bio — the two things the API lets an author change about how they
 * appear publicly. Save stays disabled until something actually differs, so
 * the button is never a lie about whether there is work to do.
 */
export function ProfileForm() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const trimmedName = name.trim();
  const trimmedBio = bio.trim();
  const dirty = trimmedName !== (user.name ?? "") || trimmedBio !== (user.bio ?? "");
  const nameTooShort = trimmedName.length > 0 && trimmedName.length < NAME_MIN;
  const bioOver = trimmedBio.length > BIO_MAX;
  const canSave = dirty && !!trimmedName && !nameTooShort && !bioOver && !saving;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setErrors({});
    setFormError("");
    setSaved(false);
    try {
      await updateProfile({ name: trimmedName, bio: trimmedBio });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 4000);
    } catch (err) {
      setErrors(fieldErrorsFrom(err));
      setFormError(formErrorFrom(err, "Could not save your profile."));
    } finally {
      setSaving(false);
    }
  }

  const bioLeft = BIO_MAX - trimmedBio.length;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <Avatar name={trimmedName || user.name} size={52} />
        <p className="text-meta text-muted">
          Your avatar is drawn from your initials, so it changes with your name.
        </p>
      </div>

      <div>
        <Label htmlFor="name">Display name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          aria-invalid={!!errors.name || nameTooShort}
          aria-describedby="name-help"
        />
        <FieldError>
          {errors.name || (nameTooShort ? `Use at least ${NAME_MIN} characters.` : "")}
        </FieldError>
        <p id="name-help" className="mt-1.5 text-meta text-muted">
          Shown on everything you publish and on your public profile.
        </p>
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="bio">Bio</Label>
          <span
            className={`font-mono text-[0.6875rem] tabular-nums ${
              bioOver ? "text-red-500" : bioLeft <= 40 ? "text-accent" : "text-muted"
            }`}
          >
            {bioLeft}
          </span>
        </div>
        <Textarea
          id="bio"
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="A sentence or two about what you build and write about."
          aria-invalid={!!errors.bio || bioOver}
        />
        <FieldError>
          {errors.bio || (bioOver ? `That is ${-bioLeft} characters over the limit.` : "")}
        </FieldError>
      </div>

      {formError && <p className="text-sm text-red-500">{formError}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" loading={saving} disabled={!canSave}>
          Save changes
        </Button>
        {dirty && !saving && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setName(user.name ?? "");
              setBio(user.bio ?? "");
              setErrors({});
              setFormError("");
            }}
          >
            Discard
          </Button>
        )}
        {saved && !dirty && (
          <span className="text-meta text-accent" role="status">
            Profile updated.
          </span>
        )}
        <Link
          href={`/author/${user._id}`}
          className="ml-auto text-meta text-muted underline-offset-2 hover:text-fg hover:underline"
        >
          View public profile
        </Link>
      </div>
    </form>
  );
}
