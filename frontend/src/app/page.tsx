import { Feed } from "@/components/Feed";

export default function Home({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const page = Math.max(1, Number(searchParams.page) || 1);
  // key forces a clean remount when the query/page changes
  return <Feed key={`${q}::${page}`} q={q} page={page} />;
}
