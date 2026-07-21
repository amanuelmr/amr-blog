"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { AuthCard, FormAlert } from "@/components/AuthCard";
import { Label, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      router.push(`/reset-password?email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send the reset code.");
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="We’ll email you a 6-digit code to reset it."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Back to log in
          </Link>
        </>
      }
    >
      {error && <FormAlert kind="error">{error}</FormAlert>}
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        </div>
        <Button type="submit" loading={loading} className="mt-1 w-full">
          Send reset code
        </Button>
      </form>
    </AuthCard>
  );
}
