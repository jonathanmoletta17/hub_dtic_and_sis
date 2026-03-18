import { ContextGuard } from "@/components/auth/ContextGuard";
import { InventoryPage } from "@/modules/inventory/components/InventoryPage";

interface PageProps {
  params: Promise<{
    context: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { context } = await params;

  return (
    <ContextGuard featureId="inventory">
      <InventoryPage context={context} />
    </ContextGuard>
  );
}
