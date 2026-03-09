/**
 * navigation.ts — Single Source of Truth para itens de menu da Sidebar.
 *
 * Regras:
 *  - `common`  → visível para TODOS os perfis (solicitante, técnico, gestor)
 *  - `tech`    → visível apenas para técnicos e gestores
 *  - `dtic`    → visível apenas no contexto DTIC (independente de perfil)
 *
 * O placeholder {ctx} é substituído em runtime pelo contexto ativo.
 */

export interface NavItem {
  icon: string;          // Nome do ícone Lucide (resolvido pelo componente)
  label: string;         // Texto do link
  href: string;          // Rota (com {ctx} como placeholder)
  matchPath?: string;    // Padrão para highlight de rota ativa (opcional)
}

export const MENU_ITEMS = {
  /** Links exclusivos para perfis técnico/gestor — renderizados ANTES dos common */
  tech: [
    { icon: "LayoutDashboard", label: "Dashboard",    href: "/{ctx}/dashboard",  matchPath: "/dashboard" },
    { icon: "Search",          label: "Smart Search",  href: "/{ctx}/search",     matchPath: "/search" },
  ] satisfies NavItem[],

  /** Links exclusivos para Gestores (Admins) */
  admin: [
    { icon: "Truck", label: "Gestão Carregadores", href: "/{ctx}/gestao-carregadores", matchPath: "/gestao-carregadores" },
  ] satisfies NavItem[],

  /** Links visíveis para TODOS os perfis */
  common: [
    { icon: "PlusCircle", label: "Novo Chamado", href: "/{ctx}/new-ticket", matchPath: "/new-ticket" },
    { icon: "Ticket", label: "Meus Chamados", href: "/{ctx}/user", matchPath: "/user" },
    { icon: "User", label: "Meu Perfil", href: "/{ctx}/user/profile", matchPath: "/user/profile" },
  ] satisfies NavItem[],

  /** Links exclusivos do contexto DTIC — renderizados entre common[0] e common[1] */
  dtic: [
    { icon: "BookOpen", label: "Base de Conhecimento", href: "/{ctx}/knowledge",     matchPath: "/knowledge" },
  ] satisfies NavItem[],
} as const;

/**
 * Resolve os hrefs substituindo {ctx} pelo contexto real.
 * Para Smart Search, aplica lógica de departamento para SIS.
 */
export function resolveMenuItems(
  context: string,
  isTechOrManager: boolean,
  isAdmin: boolean = false
): NavItem[] {
  const items: NavItem[] = [];

  // 1. Links de técnico/gestor (Dashboard, Smart Search)
  if (isTechOrManager) {
    items.push(...MENU_ITEMS.tech.map(item => {
      let href = item.href.replace("{ctx}", context);

      // Smart Search: redirecionar para contexto SIS com departamento
      if (item.matchPath === "/search") {
        if (context === "sis-manutencao") href = "/sis/search?department=manutencao";
        else if (context === "sis-memoria") href = "/sis/search?department=conservacao";
        else if (context.startsWith("sis")) href = "/sis/search";
      }

      return { ...item, href };
    }));
  }

  // 1.5. Links de Admin (Gestores)
  if (isAdmin && context.startsWith("sis")) {
    items.push(...MENU_ITEMS.admin.map(item => ({
      ...item,
      href: item.href.replace("{ctx}", context),
    })));
  }

  // 2. "Novo Chamado" (sempre)
  items.push({
    ...MENU_ITEMS.common[0],
    href: MENU_ITEMS.common[0].href.replace("{ctx}", context),
  });

  // 3. "Meus Chamados" (sempre)
  items.push({
    ...MENU_ITEMS.common[1],
    href: MENU_ITEMS.common[1].href.replace("{ctx}", context),
  });

  // 4. "Base de Conhecimento" (apenas DTIC)
  if (context === "dtic") {
    items.push({
      ...MENU_ITEMS.dtic[0],
      href: MENU_ITEMS.dtic[0].href.replace("{ctx}", context),
    });
  }

  // 5. "Meu Perfil" (sempre)
  items.push({
    ...MENU_ITEMS.common[2],
    href: MENU_ITEMS.common[2].href.replace("{ctx}", context),
  });

  return items;
}
