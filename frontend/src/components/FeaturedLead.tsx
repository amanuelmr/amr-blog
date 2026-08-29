import Link from "next/link";
import { Blog } from "@/lib/types";
import { CoverImage } from "./CoverImage";
import { Avatar } from "./Avatar";
import { formatDate, readingTime, excerpt, blogHref } from "@/lib/format";

export function FeaturedLead({ blog }: { blog: Blog }) {
  const href = blogHref(blog);
  const hasCover = !!blog.titleBackgroundImageUrl;

  return (
    <article className="group border-t-2 border-fg pt-7">
      <div className={hasCover ? "grid items-center gap-8 md:grid-cols-2 md:gap-12" : ""}>
        <div>
          <div className="mb-4 flex items-center gap-2">
            <span className="label text-accent">Featured</span>
            {blog.postType === "field-note" && (
              <>
                <span className="text-faint" aria-hidden="true">/</span>
                <span className="label text-muted">Field note</span>
              </>
            )}
            {blog.tags?.[0] && (
              <>
                <span className="text-faint" aria-hidden="true">/</span>
                <span className="font-mono text-[0.75rem] lowercase text-muted">{blog.tags[0]}</span>
              </>
            )}
          </div>

          <h2 className="text-balance font-display text-[2.1rem] font-semibold leading-[1.06] tracking-[-0.025em] md:text-[2.75rem]">
            <Link href={href} className="transition-colors group-hover:text-accent">
              {blog.title}
            </Link>
          </h2>

          <p className="mt-4 max-w-measure text-[1.0625rem] leading-relaxed text-muted">
            {excerpt(blog.content, 200)}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2.5 font-mono text-[0.6875rem] tabular-nums text-muted">
            {blog.author ? (
              <Link href={`/author/${blog.author._id}`} className="flex items-center gap-2.5 hover:text-fg">
                <Avatar name={blog.author.name} size={30} />
                <span className="font-medium text-fg">{blog.author.name}</span>
              </Link>
            ) : (
              <>
                <Avatar size={30} />
                <span className="font-medium text-fg">Unknown</span>
              </>
            )}
            <span className="text-faint" aria-hidden="true">·</span>
            <span className="tabular-nums">{formatDate(blog.createdAt)}</span>
            <span className="text-faint" aria-hidden="true">·</span>
            <span className="tabular-nums">{readingTime(blog.content)} min read</span>
          </div>
        </div>

        {hasCover && (
          <Link href={href} className="relative aspect-[4/3] overflow-hidden rounded-md bg-subtle">
            <div className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]">
              <CoverImage src={blog.titleBackgroundImageUrl} title={blog.title} priority sizes="(max-width: 768px) 100vw, 560px" />
            </div>
          </Link>
        )}
      </div>
    </article>
  );
}
