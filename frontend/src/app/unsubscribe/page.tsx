import { Unsubscribe } from "@/components/Unsubscribe";

export const metadata = { title: "Unsubscribe", robots: { index: false } };

export default function UnsubscribePage({ searchParams }: { searchParams: { token?: string } }) {
  return <Unsubscribe token={searchParams.token ?? ""} />;
}
