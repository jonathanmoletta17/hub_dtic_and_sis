// ╔══════════════════════════════════════════════════════════════════╗
// ║  ZONA PROTEGIDA — useAuthStore.ts                               ║
// ║  Qualquer alteração aqui exige plano pré-aprovado.              ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  PROIBIDO:                                                       ║
// ║    · Alterar chaves omitidas do persist (_credentials)           ║
// ║    · Reescrever a topologia dos tipos base (AuthMeResponse)      ║
// ║    · Renomear campos do contrato: session_token, hub_roles,      ║
// ║      app_access, active_hub_role                                 ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  PERMITIDO (sem aprovação):                                      ║
// ║    · Adicionar seletores de leitura (get somente)                ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  DEPENDENTES: ContextGuard, ProtectedRoute, AppSidebar,          ║
// ║               PermissionsMatrix, middleware.ts                   ║
// ║  REFERÊNCIA: ARCHITECTURE_RULES.md → Contratos Imutáveis        ║
// ╚══════════════════════════════════════════════════════════════════╝
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ProfileResponse {
  id: number;
  name: string;
}

export interface RoleResponse {
  active_profile: ProfileResponse;
  available_profiles: ProfileResponse[];
  groups: number[];
}

export interface HubRole {
  role: string;                   // "solicitante" | "tecnico-manutencao" | "tecnico-conservacao" | "tecnico" | "gestor"
  label: string;
  profile_id: number | null;
  group_id: number | null;        // Grupo GLPI de origem (para sub-papéis técnicos)
  route: string;                  // "user" | "dashboard"
  context_override: string | null; // Sub-contexto visual (ex: "sis-manutencao")
}

export interface AuthMeResponse {
  context: string;
  user_id: number;
  name: string;
  realname?: string | null;
  firstname?: string | null;
  roles: RoleResponse;
  hub_roles: HubRole[];
  app_access?: string[];
  session_token?: string;
  active_hub_role?: HubRole; // Selecionado ativamente pelo vision selector
}

interface AuthState {
  // Controle de Hidratação
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  // Dados brutos da sessão root (Login/GLPI)
  isAuthenticated: boolean;
  username: string | null;
  /** Guardamos as credenciais para poder autenticar no segundo contexto sem pedir senha de novo. */
  _credentials: { username: string; password: string } | null;
  
  // Dados de contexto ativo (DTIC vs SIS)
  activeContext: string | null;
  currentUserRole: AuthMeResponse | null;
  
  // Visão ativa: 'user' (solicitante) ou 'tech' (técnico/gestor)
  // Determina quais ações são visíveis, independente do perfil global
  activeView: 'user' | 'tech' | null;
  
  // Sessões pré-autenticadas por contexto (cache)
  contextSessions: Record<string, AuthMeResponse>;
  
  // Session tokens por contexto (persistidos)
  sessionTokens: Record<string, string>;
  
  // Actions
  login: (username: string, password: string) => void;
  logout: () => void;
  setActiveContext: (context: string, roles: AuthMeResponse) => void;
  setActiveView: (view: 'user' | 'tech') => void;
  cacheContextSession: (context: string, data: AuthMeResponse) => void;
  getCachedSession: (context: string) => AuthMeResponse | null;
  clearActiveContext: () => void;
  getCredentials: () => { username: string; password: string } | null;
  getSessionToken: (context: string) => string | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      
      isAuthenticated: false,
      username: null,
      _credentials: null,
      activeContext: null,
      currentUserRole: null,
      activeView: null,
      contextSessions: {},
      sessionTokens: {},

      login: (username, password) => set({ 
        isAuthenticated: true, 
        username,
        _credentials: { username, password },
        activeContext: null, 
        currentUserRole: null,
        activeView: null,
        contextSessions: {},
        sessionTokens: {},
      }),

      logout: () => set({ 
        isAuthenticated: false, 
        username: null,
        _credentials: null,
        activeContext: null,
        currentUserRole: null,
        activeView: null,
        contextSessions: {},
        sessionTokens: {},
      }),

      setActiveContext: (context, roles) => {
        const tokens = { ...get().sessionTokens };
        if (roles.session_token) {
          tokens[context] = roles.session_token;
        }
        set({
          activeContext: context,
          currentUserRole: roles,
          sessionTokens: tokens,
        });
      },

      setActiveView: (view) => set({ activeView: view }),

      cacheContextSession: (context, data) => set((state) => ({
        contextSessions: { ...state.contextSessions, [context]: data }
      })),

      getCachedSession: (context) => {
        return get().contextSessions[context] || null;
      },

      clearActiveContext: () => set({
        activeContext: null,
        currentUserRole: null
      }),

      getCredentials: () => get()._credentials,
      
      getSessionToken: (context) => get().sessionTokens[context] || null,
    }),
    {
      name: 'auth-storage',
      // Persiste estado essencial. Credenciais NÃO são persistidas por segurança.
      // Ao recarregar, se não tiver credenciais, o onRehydrateStorage limpa o auth.
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        username: state.username,
        activeContext: state.activeContext,
        currentUserRole: state.currentUserRole,
        contextSessions: state.contextSessions,
        sessionTokens: state.sessionTokens,
        // _credentials NÃO é persistido
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        }
      },
    }
  )
);
