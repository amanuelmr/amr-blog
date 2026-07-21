import { Article } from "@/components/Article";

export default function BlogPage({ params }: { params: { id: string } }) {
  return <Article id={params.id} />;
}
