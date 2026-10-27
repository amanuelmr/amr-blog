import type { Metadata } from "next";
import { TopicPage } from "@/components/TopicPage";

export function generateMetadata({ params }: { params: { tag: string } }): Metadata {
  const tag = decodeURIComponent(params.tag);
  return {
    title: tag,
    description: `Writing on ${tag}.`,
    alternates: {
      canonical: `/tag/${encodeURIComponent(tag)}`,
      types: { "application/rss+xml": `/tag/${encodeURIComponent(tag)}/rss.xml` },
    },
  };
}

export default function TagPage({
  params,
  searchParams,
}: {
  params: { tag: string };
  searchParams: { page?: string };
}) {
  const tag = decodeURIComponent(params.tag);
  const page = Math.max(1, Number(searchParams.page) || 1);
  return <TopicPage key={`${tag}::${page}`} tag={tag} page={page} />;
}
