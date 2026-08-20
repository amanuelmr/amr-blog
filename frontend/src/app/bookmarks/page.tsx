import { SavedPosts } from "@/components/SavedPosts";

export default function BookmarksPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Number(searchParams?.page) > 0 ? Number(searchParams.page) : 1;
  return <SavedPosts page={page} />;
}
