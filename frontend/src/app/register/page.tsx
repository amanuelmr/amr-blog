"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { AuthCard, FormAlert } from "@/components/AuthCard";
import { Label, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
      router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Join AMR Blog to publish and discuss."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Log in
          </Link>
        </>
      }
    >
      {error && <FormAlert kind="error">{error}</FormAlert>}
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" required minLength={3} value={name}
            onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" autoComplete="name" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required minLength={8} value={password}
            onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters"
            autoComplete="new-password" />
        </div>
        <Button type="submit" loading={loading} className="mt-1 w-full">
          Create account
        </Button>
      </form>
    </AuthCard>
  );
}
