import { fetchFeedPosts, rssResponse } from "@/lib/rss";

export const revalidate = 3600;

export async function GET() {
  return rssResponse(
    {
      title: "AMR Blog",
      link: "",
      description: "Articles on backend, systems, and the craft of building software.",
    },
    await fetchFeedPosts("", revalidate)
  );
}
