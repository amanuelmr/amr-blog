import { fetchFeedPosts, rssResponse } from "@/lib/rss";

export const revalidate = 3600;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const blogs = await fetchFeedPosts(`author=${encodeURIComponent(params.id)}`, revalidate);
  // The feed endpoint carries the author's name on each post; an author with
  // nothing published yet gets a generic title.
  const name = blogs[0]?.author?.name;
  return rssResponse(
    {
      title: name ? `${name} — AMR Blog` : "AMR Blog",
      link: `/author/${params.id}`,
      description: name ? `New writing by ${name} on AMR Blog.` : "New writing on AMR Blog.",
    },
    blogs
  );
}
