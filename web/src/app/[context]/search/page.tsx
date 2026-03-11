import { SearchPage } from "@/modules/search/components/SearchPage";
import { ContextGuard } from "@/components/auth/ContextGuard";

interface PageProps {
  params: Promise<{
    context: string;
  }>;
  searchParams: Promise<{
    department?: string;
  }>;
}

export default async function Page({ params, searchParams }: PageProps) {
  const { context } = await params;
  const { department } = await searchParams;

  return (
    <ContextGuard featureId="search">
      <SearchPage 
        context={context} 
        department={department} 
      />
    </ContextGuard>
  );
}
