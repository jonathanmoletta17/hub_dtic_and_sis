import { PermissionsMatrix } from "@/features/permissions/components/PermissionsMatrix";
import { ContextGuard } from "@/components/auth/ContextGuard";

interface PageProps {
  params: Promise<{
    context: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { context } = await params;

  return (
    <ContextGuard featureId="permissoes">
      <div className="p-6 md:p-8 h-full flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <PermissionsMatrix context={context} />
      </div>
    </ContextGuard>
  );
}
