"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Label, Input, Textarea, FieldError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/Avatar";
import { fieldErrorsFrom, formErrorFrom } from "@/lib/fieldErrors";
import { imageFileError } from "@/lib/imageFile";
import { uploadToCloudinary } from "@/lib/uploadToCloudinary";

const BIO_MAX = 280;
const NAME_MIN = 3;

/**
 * Photo, name and bio — what an author can change about how they appear
 * publicly. The photo saves as soon as it's picked or removed; name and bio
 * wait for Save, which stays disabled until something actually differs, so
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
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  async function savePhoto(file: File | null) {
    setPhotoError("");
    if (file) {
      const invalid = imageFileError(file);
      if (invalid) {
        setPhotoError(invalid);
        return;
      }
    }
    setPhotoBusy(true);
    try {
      const avatarUrl = file ? await uploadToCloudinary(file, "avatar") : null;
      await updateProfile({ avatarUrl });
    } catch (err) {
      setPhotoError(formErrorFrom(err, "Could not update your photo."));
    } finally {
      setPhotoBusy(false);
      if (photoRef.current) photoRef.current.value = "";
    }
  }

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
        <Avatar name={trimmedName || user.name} src={user.avatarUrl} size={52} />
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void savePhoto(e.target.files?.[0] ?? null)}
            />
            <Button type="button" size="sm" variant="ghost" loading={photoBusy} onClick={() => photoRef.current?.click()}>
              {user.avatarUrl ? "Change photo" : "Upload photo"}
            </Button>
            {user.avatarUrl && !photoBusy && (
              <Button type="button" size="sm" variant="ghost" onClick={() => void savePhoto(null)}>
                Remove
              </Button>
            )}
          </div>
          <p className="text-meta text-muted">
            {photoError ? (
              <span className="text-red-500">{photoError}</span>
            ) : user.avatarUrl ? (
              "Shown on your posts, comments and profile."
            ) : (
              "Without a photo, your avatar is drawn from your initials."
            )}
          </p>
        </div>
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
