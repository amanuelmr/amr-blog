import { ReadingHistory } from "@/components/ReadingHistory";

export default function HistoryPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  return <ReadingHistory key={page} page={page} />;
}
