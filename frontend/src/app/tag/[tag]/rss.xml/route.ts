import { fetchFeedPosts, rssResponse } from "@/lib/rss";

export const revalidate = 3600;

export async function GET(_req: Request, { params }: { params: { tag: string } }) {
  const tag = decodeURIComponent(params.tag);
  return rssResponse(
    {
      title: `${tag} — AMR Blog`,
      link: `/tag/${encodeURIComponent(tag)}`,
      description: `Writing on ${tag} from AMR Blog.`,
    },
    await fetchFeedPosts(`tag=${encodeURIComponent(tag)}`, revalidate)
  );
}
