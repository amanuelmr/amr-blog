import Link from "next/link";
import { Blog } from "@/lib/types";
import { CoverImage } from "./CoverImage";
import { Avatar } from "./Avatar";
import { TagChip } from "./TagChip";
import { formatDate, readingTime, excerpt, blogHref } from "@/lib/format";

export function BlogCard({ blog }: { blog: Blog }) {
  const href = blogHref(blog);
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg hover:shadow-black/5">
      <Link href={href} className="relative block aspect-[16/10] overflow-hidden bg-subtle">
        <div className="h-full w-full transition-transform duration-500 group-hover:scale-105">
          <CoverImage src={blog.titleBackgroundImageUrl} title={blog.title} />
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-5">
        {blog.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {blog.tags.slice(0, 3).map((t) => (
              <TagChip key={t} tag={t} href={`/?q=${encodeURIComponent(t)}`} />
            ))}
          </div>
        )}

        <h3 className="text-balance text-lg font-semibold leading-snug">
          <Link href={href} className="transition-colors group-hover:text-accent">
            {blog.title}
          </Link>
        </h3>

        <p className="text-sm leading-relaxed text-muted">{excerpt(blog.content)}</p>

        <div className="mt-auto flex items-center gap-2.5 pt-2 text-sm text-muted">
          <Avatar name={blog.author?.name} size={28} />
          <span className="truncate text-fg">{blog.author?.name ?? "Unknown"}</span>
          <span className="text-border">·</span>
          <span className="whitespace-nowrap">{formatDate(blog.createdAt)}</span>
          <span className="ml-auto flex items-center gap-3 whitespace-nowrap tabular-nums">
            <span title="Likes">♥ {blog.likes?.length ?? 0}</span>
            <span className="text-muted/70">{readingTime(blog.content)}m</span>
          </span>
        </div>
      </div>
    </article>
  );
}
