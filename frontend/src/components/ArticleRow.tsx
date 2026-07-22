import Link from "next/link";
import { Blog } from "@/lib/types";
import { CoverImage } from "./CoverImage";
import { formatDate, readingTime, blogHref } from "@/lib/format";

export function ArticleRow({ blog, index }: { blog: Blog; index: number }) {
  const href = blogHref(blog);
  const num = String(index + 1).padStart(2, "0");
  const hasCover = !!blog.titleBackgroundImageUrl;

  return (
    <Link
      href={href}
      className="group grid grid-cols-[2.5rem_1fr] items-start gap-4 border-t border-border py-7 sm:grid-cols-[3rem_1fr_auto] sm:gap-6"
    >
      <span className="pt-1 font-mono text-sm tabular-nums text-muted transition-colors group-hover:text-accent">
        {num}
      </span>

      <div className="min-w-0">
        <h3 className="text-balance font-serif text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
          <span className="transition-colors group-hover:text-accent">{blog.title}</span>
          <span className="ml-1.5 inline-block text-accent opacity-0 transition-opacity group-hover:opacity-100">→</span>
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.1em] text-muted">
          {blog.tags?.[0] && (
            <>
              <span>{blog.tags[0]}</span>
              <span className="text-border">·</span>
            </>
          )}
          <span className="tabular-nums normal-case">{formatDate(blog.createdAt)}</span>
          <span className="text-border">·</span>
          <span className="tabular-nums normal-case">{readingTime(blog.content)} min</span>
        </div>
      </div>

      {hasCover && (
        <div className="relative hidden h-16 w-24 flex-none overflow-hidden rounded-md bg-subtle sm:block">
          <CoverImage src={blog.titleBackgroundImageUrl} title={blog.title} sizes="96px" />
        </div>
      )}
    </Link>
  );
}
