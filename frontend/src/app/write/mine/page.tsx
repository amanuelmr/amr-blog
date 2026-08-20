import { MyPosts } from "@/components/MyPosts";

export default function WriteMinePage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Number(searchParams?.page) > 0 ? Number(searchParams.page) : 1;
  return <MyPosts page={page} />;
}
