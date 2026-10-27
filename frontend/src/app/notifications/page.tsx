import { Notifications } from "@/components/Notifications";

export default function NotificationsPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  return <Notifications key={page} page={page} />;
}
