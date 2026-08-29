import Link from "next/link";
import { Blog } from "@/lib/types";
import { CoverImage } from "./CoverImage";
import { formatDate, readingTime, blogHref, excerpt } from "@/lib/format";

/**
 * One line of the index. `index` is the running position in the whole feed,
 * not within the page, so the numbering reads as a continuous list.
 */
export function ArticleRow({ blog, index }: { blog: Blog; index: number }) {
  const href = blogHref(blog);
  const num = String(index + 1).padStart(2, "0");
  const hasCover = !!blog.titleBackgroundImageUrl;

  return (
    <Link
      href={href}
      className="group grid grid-cols-[2rem_1fr] items-baseline gap-x-4 gap-y-2 rule-top py-6 sm:grid-cols-[2.5rem_1fr_auto] sm:gap-x-6"
    >
      <span className="font-mono text-[0.6875rem] tabular-nums text-faint transition-colors group-hover:text-accent">
        {num}
      </span>

      <div className="min-w-0">
        {(blog.postType === "field-note" || blog.tags?.length > 0) && (
          <p className="mb-1.5 flex items-center gap-2 font-mono text-[0.75rem] lowercase tracking-tight text-muted">
            {blog.postType === "field-note" && (
              <span className="label text-accent">Field note</span>
            )}
            {blog.postType === "field-note" && blog.tags?.length > 0 && (
              <span className="text-faint" aria-hidden="true">/</span>
            )}
            {blog.tags?.length > 0 && blog.tags.slice(0, 2).join(" / ")}
          </p>
        )}

        <h3 className="text-balance font-display text-[1.3rem] font-semibold leading-[1.25] tracking-[-0.015em] sm:text-[1.45rem]">
          <span className="transition-colors group-hover:text-accent">{blog.title}</span>
        </h3>

        <p className="mt-1.5 line-clamp-2 max-w-measure text-[0.9375rem] leading-relaxed text-muted">
          {excerpt(blog.content, 130)}
        </p>

        <div className="mt-2 flex items-center gap-2 font-mono text-[0.6875rem] tabular-nums text-muted">
          <span>{formatDate(blog.createdAt)}</span>
          <span className="text-faint" aria-hidden="true">·</span>
          <span>{readingTime(blog.content)} min read</span>
        </div>
      </div>

      {hasCover && (
        <div className="relative hidden h-[4.5rem] w-28 flex-none overflow-hidden rounded bg-subtle sm:block">
          <CoverImage src={blog.titleBackgroundImageUrl} title={blog.title} sizes="112px" />
        </div>
      )}
    </Link>
  );
}
