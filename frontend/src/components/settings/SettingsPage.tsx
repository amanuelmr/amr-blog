"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/format";
import { ProfileForm } from "./ProfileForm";
import { PasswordForm } from "./PasswordForm";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rule-top grid gap-6 py-10 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-10">
      <div>
        <h2 className="font-display text-[1.15rem] font-semibold tracking-[-0.01em]">{title}</h2>
        <p className="mt-1.5 text-meta leading-relaxed text-muted">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function Row({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="rule-top flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3 first:border-t-0 first:pt-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm text-fg">{value}</span>
      {note && <span className="w-full text-meta text-muted">{note}</span>}
    </div>
  );
}

function SettingsInner() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl px-5 py-12 sm:px-6 sm:py-16">
      <header className="mb-4">
        <p className="label text-accent">Account</p>
        <h1 className="mt-3 font-display text-[2.1rem] font-semibold leading-tight tracking-[-0.02em] sm:text-[2.5rem]">
          Settings
        </h1>
        <p className="mt-3 max-w-measure text-[1.0625rem] leading-relaxed text-muted">
          How you appear to readers, and how you get into your account.
        </p>
      </header>

      <Section
        title="Profile"
        description="Your name and bio, shown on your posts and your public author page."
      >
        <ProfileForm />
      </Section>

      <Section
        title="Password"
        description="Change the password you use to sign in. You will need your current one."
      >
        <PasswordForm />
      </Section>

      <Section
        title="Account"
        description="Details we hold about your account. These are not shown on your public profile."
      >
        <div className="flex flex-col">
          <Row
            label="Email"
            value={<span className="font-mono text-[0.8125rem]">{user.email}</span>}
            note="Your email cannot be changed here yet — it is the address your sign-in code and password resets go to."
          />
          <Row
            label="Email status"
            value={
              user.verified ? (
                <span className="rounded border border-accent/40 bg-accent-soft px-2 py-0.5 font-mono text-[0.6875rem] uppercase tracking-wider text-accent">
                  Verified
                </span>
              ) : (
                <Link href={`/verify-email?email=${encodeURIComponent(user.email)}`} className="text-accent underline-offset-2 hover:underline">
                  Not verified — verify now
                </Link>
              )
            }
          />
          {user.createdAt && (
            <Row label="Member since" value={<span className="font-mono text-[0.8125rem]">{formatDate(user.createdAt)}</span>} />
          )}
          <Row
            label="Your writing"
            value={
              <Link href="/write/mine" className="text-accent underline-offset-2 hover:underline">
                Drafts and published posts
              </Link>
            }
          />
          <Row
            label="Reading list"
            value={
              <Link href="/bookmarks" className="text-accent underline-offset-2 hover:underline">
                Saved articles
              </Link>
            }
          />
        </div>
      </Section>

      <section className="rule-top flex flex-wrap items-center justify-between gap-4 py-10">
        <div>
          <h2 className="font-display text-[1.15rem] font-semibold tracking-[-0.01em]">
            Sign out
          </h2>
          <p className="mt-1.5 text-meta text-muted">Ends this session on this device.</p>
        </div>
        <Button variant="secondary" size="md" onClick={() => logout()}>
          Sign out
        </Button>
      </section>
    </div>
  );
}

export function SettingsPage() {
  return (
    <RequireAuth>
      <SettingsInner />
    </RequireAuth>
  );
}
