"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { AuthCard, FormAlert } from "@/components/AuthCard";
import { Label, Input } from "@/components/ui/Field";
import { OtpInput } from "@/components/ui/OtpInput";
import { Button } from "@/components/ui/Button";

export function ResetPasswordForm() {
  const { resetPassword } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await resetPassword(email.trim(), otp.trim(), password);
      router.push("/login?reset=1");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reset the password.");
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Set a new password"
      subtitle="Enter the code we emailed you and choose a new password."
      footer={
        <Link href="/login" className="font-medium text-accent hover:underline">
          Back to log in
        </Link>
      }
    >
      {error && <FormAlert kind="error">{error}</FormAlert>}
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div>
          <Label>Reset code</Label>
          <OtpInput value={otp} onChange={setOtp} autoFocus />
        </div>
        <div>
          <Label htmlFor="password">New password</Label>
          <Input id="password" type="password" required minLength={8} value={password}
            onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters"
            autoComplete="new-password" />
        </div>
        <Button type="submit" loading={loading} className="mt-1 w-full">
          Reset password
        </Button>
      </form>
    </AuthCard>
  );
}
