import { ContextGuard } from "@/components/auth/ContextGuard";
import { AnalyticsDashboardPage } from "@/modules/analytics/components/AnalyticsDashboardPage";

interface PageProps {
  params: Promise<{
    context: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { context } = await params;

  return (
    <ContextGuard featureId="analytics">
      <AnalyticsDashboardPage context={context} />
    </ContextGuard>
  );
}
