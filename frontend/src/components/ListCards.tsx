import Link from "next/link";
import { ReadingListSummary } from "@/lib/types";

/** A grid of reading lists, each linking to its page. */
export function ListCards({ lists }: { lists: ReadingListSummary[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {lists.map((l) => (
        <li key={l._id}>
          <Link href={`/lists/${l._id}`} className="block rounded-md border border-border bg-card p-4 transition-colors hover:bg-subtle">
            <p className="flex items-center gap-2 font-semibold text-fg">
              <span className="truncate">{l.name}</span>
              {!l.isPublic && <span className="flex-none text-[0.6875rem] font-normal text-faint">Private</span>}
            </p>
            {l.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{l.description}</p>}
            <p className="mt-2 font-mono text-[0.6875rem] tabular-nums text-muted">
              {l.itemCount} {l.itemCount === 1 ? "post" : "posts"}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
