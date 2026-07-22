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

export function VerifyEmailForm() {
  const { verifyEmail, resendOtp } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await verifyEmail(email.trim(), otp.trim());
      router.push("/login?verified=1");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Verification failed.");
      setLoading(false);
    }
  }

  async function onResend() {
    setError("");
    setNotice("");
    try {
      await resendOtp(email.trim());
      setNotice("A new code is on its way to your inbox.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not resend the code.");
    }
  }

  return (
    <AuthCard
      title="Verify your email"
      subtitle="Enter the 6-digit code we emailed you to activate your account."
      footer={
        <>
          Wrong email?{" "}
          <Link href="/register" className="font-medium text-accent hover:underline">
            Start over
          </Link>
        </>
      }
    >
      {error && <FormAlert kind="error">{error}</FormAlert>}
      {notice && <FormAlert kind="success">{notice}</FormAlert>}
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div>
          <Label>Verification code</Label>
          <OtpInput value={otp} onChange={setOtp} autoFocus />
        </div>
        <Button type="submit" loading={loading} disabled={otp.length < 6} className="mt-1 w-full">
          Verify email
        </Button>
      </form>
      <button onClick={onResend} className="mt-4 w-full text-center text-sm text-muted hover:text-fg">
        Didn’t get it? Resend code
      </button>
    </AuthCard>
  );
}
