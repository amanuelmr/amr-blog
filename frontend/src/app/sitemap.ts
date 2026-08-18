import type { MetadataRoute } from "next";
import { serverApiBase } from "@/lib/api";
import { blogHref } from "@/lib/format";
import { Blog } from "@/lib/types";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const MAX_PAGES = 10; // caps at 500 posts (50/page) so a huge archive can't stall the build

export const revalidate = 3600;

async function fetchAllBlogs(): Promise<Blog[]> {
  const blogs: Blog[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(`${serverApiBase()}/blogs?page=${page}&limit=50`, {
      next: { revalidate },
    });
    if (!res.ok) break;
    const data = await res.json();
    blogs.push(...(data.blogs ?? []));
    if (page >= (data.totalPages ?? 1)) break;
  }
  return blogs;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
  ];

  let blogs: Blog[] = [];
  try {
    blogs = await fetchAllBlogs();
  } catch {
    return staticRoutes;
  }

  const postRoutes: MetadataRoute.Sitemap = blogs.map((b) => ({
    url: `${SITE_URL}${blogHref(b)}`,
    lastModified: b.createdAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...postRoutes];
}
