import { serverApiBase } from "@/lib/api";
import { blogHref, excerpt } from "@/lib/format";
import { Blog } from "@/lib/types";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export const revalidate = 3600;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function itemXml(blog: Blog): string {
  const url = `${SITE_URL}${blogHref(blog)}`;
  // RSS 2.0's <author> is defined as an email address, which we don't want to
  // expose publicly. dc:creator is the standard way to publish a plain name.
  const author = blog.author?.name
    ? `<dc:creator>${escapeXml(blog.author.name)}</dc:creator>`
    : "";
  return `  <item>
    <title>${escapeXml(blog.title)}</title>
    <link>${url}</link>
    <guid isPermaLink="true">${url}</guid>
    <pubDate>${new Date(blog.createdAt).toUTCString()}</pubDate>
    ${author}
    <description>${escapeXml(excerpt(blog.content, 280))}</description>
  </item>`;
}

export async function GET() {
  let blogs: Blog[] = [];
  try {
    const res = await fetch(`${serverApiBase()}/blogs?limit=50`, { next: { revalidate } });
    if (res.ok) {
      const data = await res.json();
      blogs = data.blogs ?? [];
    }
  } catch {
    blogs = [];
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
  <title>AMR Blog</title>
  <link>${SITE_URL}</link>
  <description>Articles on backend, systems, and the craft of building software.</description>
  <language>en-us</language>
${blogs.map(itemXml).join("\n")}
</channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
