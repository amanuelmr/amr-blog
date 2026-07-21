import Link from "next/link";

export function TagChip({ tag, href }: { tag: string; href?: string }) {
  const className =
    "inline-flex items-center rounded-full border border-border bg-subtle px-2.5 py-0.5 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent";
  if (href) {
    return (
      <Link href={href} className={className}>
        {tag}
      </Link>
    );
  }
  return <span className={className}>{tag}</span>;
}
