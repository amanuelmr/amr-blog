import Link from "next/link";
import { ReactNode } from "react";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-baseline gap-1 text-xl font-bold tracking-tight">
          AMR<span className="text-accent">.</span>
          <span className="font-normal text-muted">blog</span>
        </Link>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
    </div>
  );
}

export function FormAlert({ kind, children }: { kind: "error" | "success"; children: ReactNode }) {
  const styles =
    kind === "error"
      ? "border-red-500/30 bg-red-500/5 text-red-500"
      : "border-accent/30 bg-accent/5 text-accent";
  return <div className={`mb-4 rounded-lg border px-3.5 py-2.5 text-sm ${styles}`}>{children}</div>;
}
