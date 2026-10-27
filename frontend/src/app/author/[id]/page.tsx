import type { Metadata } from "next";
import { AuthorProfile } from "@/components/AuthorProfile";

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  return {
    alternates: { types: { "application/rss+xml": `/author/${params.id}/rss.xml` } },
  };
}

export default function AuthorPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { page?: string };
}) {
  const page = Number(searchParams?.page) > 0 ? Number(searchParams.page) : 1;
  return <AuthorProfile id={params.id} page={page} />;
}
