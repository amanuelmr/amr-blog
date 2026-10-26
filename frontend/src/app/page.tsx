import { Feed } from "@/components/Feed";

export default function Home({
  searchParams,
}: {
  searchParams: { q?: string; page?: string; view?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const view = searchParams.view === "for-you" ? "for-you" : "latest";
  // key forces a clean remount when the query/page/view changes
  return <Feed key={`${q}::${page}::${view}`} q={q} page={page} view={view} />;
}
