import Link from "next/link";

export function Pagination({
  page,
  totalPages,
  makeHref,
}: {
  page: number;
  totalPages: number;
  makeHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const from = Math.max(1, page - 2);
  const to = Math.min(totalPages, from + 4);
  for (let p = from; p <= to; p++) pages.push(p);

  const itemBase =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm transition-colors";

  return (
    <nav className="mt-10 flex items-center justify-center gap-1.5" aria-label="Pagination">
      {page > 1 && (
        <Link href={makeHref(page - 1)} className={`${itemBase} border-border bg-card hover:bg-subtle`}>
          ← Prev
        </Link>
      )}
      {pages.map((p) => (
        <Link
          key={p}
          href={makeHref(p)}
          aria-current={p === page ? "page" : undefined}
          className={
            p === page
              ? `${itemBase} border-accent bg-accent text-accent-fg`
              : `${itemBase} border-border bg-card hover:bg-subtle`
          }
        >
          {p}
        </Link>
      ))}
      {page < totalPages && (
        <Link href={makeHref(page + 1)} className={`${itemBase} border-border bg-card hover:bg-subtle`}>
          Next →
        </Link>
      )}
    </nav>
  );
}
