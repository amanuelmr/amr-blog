import Link from "next/link";
import { Blog } from "@/lib/types";
import { CoverImage } from "./CoverImage";
import { Avatar } from "./Avatar";
import { formatDate, readingTime, excerpt, blogHref } from "@/lib/format";

export function FeaturedLead({ blog }: { blog: Blog }) {
  const href = blogHref(blog);
  const hasCover = !!blog.titleBackgroundImageUrl;

  return (
    <article className="group border-t-2 border-fg pt-8">
      <div className={hasCover ? "grid items-center gap-8 md:grid-cols-2 md:gap-12" : ""}>
        <div>
          <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em]">
            <span className="text-accent">Featured</span>
            {blog.tags?.[0] && (
              <>
                <span className="text-border">/</span>
                <span className="text-muted">{blog.tags[0]}</span>
              </>
            )}
          </div>

          <h2 className="text-balance font-serif text-4xl font-bold leading-[1.08] tracking-tight md:text-5xl">
            <Link href={href} className="transition-colors group-hover:text-accent">
              {blog.title}
            </Link>
          </h2>

          <p className="mt-5 max-w-prose text-lg leading-relaxed text-muted">
            {excerpt(blog.content, 200)}
          </p>

          <div className="mt-6 flex items-center gap-2.5 text-sm text-muted">
            <Avatar name={blog.author?.name} size={30} />
            <span className="font-medium text-fg">{blog.author?.name ?? "Unknown"}</span>
            <span className="text-border">·</span>
            <span className="tabular-nums">{formatDate(blog.createdAt)}</span>
            <span className="text-border">·</span>
            <span className="tabular-nums">{readingTime(blog.content)} min read</span>
          </div>
        </div>

        {hasCover && (
          <Link href={href} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-subtle">
            <div className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]">
              <CoverImage src={blog.titleBackgroundImageUrl} title={blog.title} priority sizes="(max-width: 768px) 100vw, 560px" />
            </div>
          </Link>
        )}
      </div>
    </article>
  );
}
