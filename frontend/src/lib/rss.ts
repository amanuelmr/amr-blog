import { serverApiBase } from "@/lib/api";
import { blogHref, publishedDate, summary } from "@/lib/format";
import { Blog } from "@/lib/types";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

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
    <pubDate>${new Date(publishedDate(blog)).toUTCString()}</pubDate>
    ${author}
    <description>${escapeXml(summary(blog, 280))}</description>
  </item>`;
}

/** Latest 50 live posts matching `query` (a /blogs query string, e.g. "tag=go"). */
export async function fetchFeedPosts(query = "", revalidate = 3600): Promise<Blog[]> {
  try {
    const res = await fetch(`${serverApiBase()}/blogs?limit=50${query ? `&${query}` : ""}`, {
      next: { revalidate },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.blogs ?? [];
  } catch {
    return [];
  }
}

/** An RSS 2.0 response for a channel of posts. `link` is a site path. */
export function rssResponse(channel: { title: string; link: string; description: string }, blogs: Blog[]): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
  <title>${escapeXml(channel.title)}</title>
  <link>${SITE_URL}${channel.link}</link>
  <description>${escapeXml(channel.description)}</description>
  <language>en-us</language>
${blogs.map(itemXml).join("\n")}
</channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
