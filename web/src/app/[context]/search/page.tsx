import { SearchPage } from "@/modules/search/components/SearchPage";

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
    <SearchPage 
      context={context} 
      department={department} 
    />
  );
}
