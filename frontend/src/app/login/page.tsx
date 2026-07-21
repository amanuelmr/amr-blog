"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { AuthCard, FormAlert } from "@/components/AuthCard";
import { Label, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [needsVerify, setNeedsVerify] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNeedsVerify(false);
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.push("/");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        const data = err.data as { needsVerification?: boolean } | undefined;
        if (data?.needsVerification) setNeedsVerify(true);
      } else {
        setError("Login failed. Please try again.");
      }
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to write, like, and join the conversation."
      footer={
        <>
          New here?{" "}
          <Link href="/register" className="font-medium text-accent hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {error && (
        <FormAlert kind="error">
          {error}
          {needsVerify && (
            <>
              {" "}
              <Link
                href={`/verify-email?email=${encodeURIComponent(email)}`}
                className="font-medium underline"
              >
                Verify now
              </Link>
            </>
          )}
        </FormAlert>
      )}
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="mb-1.5 text-xs text-accent hover:underline">
              Forgot?
            </Link>
          </div>
          <Input id="password" type="password" autoComplete="current-password" required
            value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        <Button type="submit" loading={loading} className="mt-1 w-full">
          Log in
        </Button>
      </form>
    </AuthCard>
  );
}
