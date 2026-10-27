"use client";

import { useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { Button } from "./ui/Button";

/**
 * Landing page for the unsubscribe link in new-post emails. It asks for a
 * click rather than unsubscribing on load, so a mail scanner that prefetches
 * links can't unsubscribe anyone by accident. No login needed.
 */
export function Unsubscribe({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function confirm() {
    setState("busy");
    try {
      const res = await api<{ authorName: string | null }>("/auth/unsubscribe", { method: "POST", body: { token } });
      setAuthorName(res.authorName);
      setState("done");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not unsubscribe. Please try again.");
      setState("error");
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-20 text-center">
      <p className="label text-muted">Email</p>
      {state === "done" ? (
        <>
          <h1 className="mt-3 font-display text-2xl font-semibold">You’re unsubscribed</h1>
          <p className="mt-3 text-muted">
            You won’t get emails about new posts{authorName ? ` from ${authorName}` : ""} anymore.
          </p>
        </>
      ) : !token ? (
        <>
          <h1 className="mt-3 font-display text-2xl font-semibold">Link incomplete</h1>
          <p className="mt-3 text-muted">This unsubscribe link is missing its code. Use the link from the email.</p>
        </>
      ) : (
        <>
          <h1 className="mt-3 font-display text-2xl font-semibold">Stop these emails?</h1>
          <p className="mt-3 text-muted">You’ll stop getting an email when this writer publishes.</p>
          {state === "error" && <p className="mt-3 text-sm text-red-500">{error}</p>}
          <div className="mt-6">
            <Button onClick={confirm} loading={state === "busy"}>Unsubscribe</Button>
          </div>
        </>
      )}
      <Link href="/" className="mt-8 inline-block text-sm text-accent hover:underline">← AMR Blog</Link>
    </div>
  );
}
