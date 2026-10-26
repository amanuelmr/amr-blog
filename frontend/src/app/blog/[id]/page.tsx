import type { Metadata } from "next";
import { Article } from "@/components/Article";
import { serverApiBase } from "@/lib/api";
import { Blog } from "@/lib/types";
import { blogHref, excerpt, publishedDate } from "@/lib/format";

// Server-rendered so links shared to chat apps and social networks unfurl
// with the post's own title, description and cover instead of the site
// defaults. view=false: a crawler or this render isn't a reader.
async function fetchBlog(id: string): Promise<Blog | null> {
  try {
    const res = await fetch(`${serverApiBase()}/blogs/${encodeURIComponent(id)}?view=false`, {
      next: { revalidate: 300 },
    });
    return res.ok ? ((await res.json()) as Blog) : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const blog = await fetchBlog(params.id);
  if (!blog) return {};

  const description = excerpt(blog.content, 160);
  const images = blog.titleBackgroundImageUrl ? [{ url: blog.titleBackgroundImageUrl }] : undefined;

  return {
    title: blog.title,
    description,
    // Next replaces (not merges) these objects from the layout, so the RSS
    // link and site name are repeated here.
    alternates: { canonical: blogHref(blog), types: { "application/rss+xml": "/rss.xml" } },
    openGraph: {
      type: "article",
      siteName: "AMR Blog",
      title: blog.title,
      description,
      url: blogHref(blog),
      publishedTime: publishedDate(blog),
      modifiedTime: blog.editedAt || undefined,
      authors: blog.author?.name ? [blog.author.name] : undefined,
      tags: blog.tags,
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: blog.title,
      description,
      images: images?.map((i) => i.url),
    },
  };
}

export default function BlogPage({ params }: { params: { id: string } }) {
  return <Article id={params.id} />;
}
