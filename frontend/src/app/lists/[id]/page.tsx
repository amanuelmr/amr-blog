import { ListView } from "@/components/ListView";

export default function ListPage({ params }: { params: { id: string } }) {
  return <ListView id={params.id} />;
}
