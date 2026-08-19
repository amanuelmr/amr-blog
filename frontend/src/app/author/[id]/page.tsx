import { AuthorProfile } from "@/components/AuthorProfile";

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
