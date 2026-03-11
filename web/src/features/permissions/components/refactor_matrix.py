import re

filepath = r"c:\Users\jonathan-moletta\.gemini\antigravity\playground\tensor-aurora\web\src\features\permissions\components\PermissionsMatrix.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update `computeDiagnostics` definition
content = content.replace(
    "function computeDiagnostics(users: AdminUser[], context: string): DiagnosticAlert[] {",
    "function computeDiagnostics(users: AdminUser[], targetContext: string): DiagnosticAlert[] {"
)
# Update `context.startsWith('sis')` inside computeDiagnostics
content = re.sub(
    r"if \(context\.startsWith\('sis'\)\) \{",
    "if (targetContext.startsWith('sis')) {",
    content
)

# 2. Update `StatusBadge`
content = content.replace(
    "function StatusBadge({ user, context }: { user: AdminUser, context: string }) {",
    "function StatusBadge({ user, targetContext }: { user: AdminUser, targetContext: string }) {"
)
content = content.replace(
    "const alerts = computeDiagnostics([user], context);",
    "const alerts = computeDiagnostics([user], targetContext);"
)

# 3. Update `ModuleChip`
content = content.replace(
    "function ModuleChip({ mod, hasAccess, user, context, onRefresh }: { mod: typeof AVAILABLE_MODULES[string][0]; hasAccess: boolean; user: AdminUser; context: string; onRefresh: () => void; }) {",
    "function ModuleChip({ mod, hasAccess, user, routingContext, targetContext, onRefresh }: { mod: typeof AVAILABLE_MODULES[string][0]; hasAccess: boolean; user: AdminUser; routingContext: string; targetContext: string; onRefresh: () => void; }) {"
)
content = content.replace(
    "await revokeModuleFromUser(context, user.id, mod.id);",
    "await revokeModuleFromUser(routingContext, user.id, mod.id, targetContext);"
)
content = content.replace(
    "await assignModuleToUser(context, user.id, mod.id);",
    "await assignModuleToUser(routingContext, user.id, mod.id, targetContext);"
)

# 4. Update `UserCard`
content = content.replace(
    "function UserCard({ user, context, onClose, onRefresh }: { user: AdminUser; context: string; onClose: () => void; onRefresh: () => void; }) {",
    "function UserCard({ user, routingContext, targetContext, onClose, onRefresh }: { user: AdminUser; routingContext: string; targetContext: string; onClose: () => void; onRefresh: () => void; }) {"
)
content = content.replace(
    "const contextKey = context.startsWith('sis') ? 'sis' : 'dtic';",
    "const contextKey = targetContext.startsWith('sis') ? 'sis' : 'dtic';"
)
content = content.replace(
    "const alerts = computeDiagnostics([user], context);",
    "const alerts = computeDiagnostics([user], targetContext);"
)
content = content.replace(
    "await assignModuleToUser(context, user.id, permMod.id);",
    "await assignModuleToUser(routingContext, user.id, permMod.id, targetContext);"
)
content = content.replace(
    "<ModuleChip key={mod.id} mod={mod} hasAccess={hasAccess} user={user} context={context} onRefresh={onRefresh} />",
    "<ModuleChip key={mod.id} mod={mod} hasAccess={hasAccess} user={user} routingContext={routingContext} targetContext={targetContext} onRefresh={onRefresh} />"
)

# 5. Update `TabUsuarios`
content = content.replace(
    "function TabUsuarios({ users, searchQuery, context, onRefresh, onSelectUser }: { users: AdminUser[]; searchQuery: string; context: string; onRefresh: () => void; onSelectUser: (user: AdminUser) => void }) {",
    "function TabUsuarios({ users, searchQuery, targetContext, onRefresh, onSelectUser }: { users: AdminUser[]; searchQuery: string; targetContext: string; onRefresh: () => void; onSelectUser: (user: AdminUser) => void }) {"
)
content = content.replace(
    "computeDiagnostics([u], context)",
    "computeDiagnostics([u], targetContext)"
)
content = content.replace(
    "<StatusBadge user={user} context={context} />",
    "<StatusBadge user={user} targetContext={targetContext} />"
)

# 6. Update `TabRoles`
content = content.replace(
    "function TabRoles({ users, context, onSelectUser }: { users: AdminUser[]; context: string; onSelectUser: (user: AdminUser) => void }) {",
    "function TabRoles({ users, targetContext, onSelectUser }: { users: AdminUser[]; targetContext: string; onSelectUser: (user: AdminUser) => void }) {"
)
content = content.replace(
    "const contextKey = context.startsWith('sis') ? 'sis' : 'dtic';",
    "const contextKey = targetContext.startsWith('sis') ? 'sis' : 'dtic';"
)

# 7. Update `TabDiagnostico`
content = content.replace(
    "function TabDiagnostico({ users, context }: { users: AdminUser[]; context: string }) {",
    "function TabDiagnostico({ users, targetContext }: { users: AdminUser[]; targetContext: string }) {"
)
content = content.replace(
    "computeDiagnostics(users, context)",
    "computeDiagnostics(users, targetContext)"
)

# 8. Main Component `PermissionsMatrix`
# 8.1 Add view context state
content = content.replace(
    "const [activeTab, setActiveTab] = useState<TabId>('usuarios');",
    "const [activeTab, setActiveTab] = useState<TabId>('usuarios');\n    const [viewingContext, setViewingContext] = useState<string>(context.startsWith('sis') ? 'sis' : 'dtic');"
)
# 8.2 fetchUsersDiagnostics call
content = content.replace(
    "const data = await fetchUsersDiagnostics(context);",
    "const data = await fetchUsersDiagnostics(context, viewingContext);"
)
# 8.3 loadUsers dependencies
content = content.replace(
    "}, [context]);",
    "}, [context, viewingContext]);"
)
# 8.4 stats block
content = content.replace(
    "const alerts = computeDiagnostics(users, context).filter(a => a.type !== 'info').length;",
    "const alerts = computeDiagnostics(users, viewingContext).filter(a => a.type !== 'info').length;"
)
content = content.replace(
    "}, [users, context]);",
    "}, [users, viewingContext]);"
)
# 8.5 Header updates
content = re.sub(
    r"Visão consolidada de usuários, roles e módulos — \{context\.toUpperCase\(\)\}",
    "Visão consolidada de usuários, roles e módulos — {viewingContext.toUpperCase()}",
    content
)

# The Context Switcher HTML
header_replacement = """                    <h2 className="text-xl lg:text-2xl font-semibold text-text-1 tracking-tight flex items-center gap-2.5">
                        <Shield className="w-6 h-6 text-accent-blue" />
                        Gestão de Acessos
                    </h2>
                    <div className="flex items-center gap-3 mt-1.5">
                        <p className="text-text-2/50 text-[13px]">
                            Visão consolidada de usuários, roles e módulos — {viewingContext.toUpperCase()}
                        </p>
                        <div className="flex bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.04]">
                            <button 
                                onClick={() => setViewingContext('dtic')}
                                className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-colors ${viewingContext === 'dtic' ? 'bg-accent-blue/20 text-accent-blue' : 'text-text-3/50 hover:text-text-2'}`}
                            >DTIC</button>
                            <button 
                                onClick={() => setViewingContext('sis')}
                                className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-colors ${viewingContext === 'sis' ? 'bg-emerald-500/20 text-emerald-400' : 'text-text-3/50 hover:text-text-2'}`}
                            >SIS</button>
                        </div>
                    </div>"""

# Apply header replacement
content = re.sub(
    r'<h2 className="text-xl lg:text-2xl font-semibold text-text-1 tracking-tight flex items-center gap-2\.5">.*?Visão consolidada de usuários, roles e módulos — \{viewingContext\.toUpperCase\(\)\}\s*</p>',
    header_replacement,
    content,
    flags=re.DOTALL
)

# 8.6 Component Render block
content = content.replace(
    "<UserCard \n                        user={selectedUser} \n                        context={context} \n                        onClose={() => setSelectedUser(null)} \n                        onRefresh={loadUsers} \n                    />",
    "<UserCard \n                        user={selectedUser} \n                        routingContext={context} \n                        targetContext={viewingContext} \n                        onClose={() => setSelectedUser(null)} \n                        onRefresh={loadUsers} \n                    />"
)
content = content.replace(
    "<TabUsuarios users={users} searchQuery={searchQuery} context={context} onRefresh={loadUsers} onSelectUser={setSelectedUser} />",
    "<TabUsuarios users={users} searchQuery={searchQuery} targetContext={viewingContext} onRefresh={loadUsers} onSelectUser={setSelectedUser} />"
)
content = content.replace(
    "<TabRoles users={users} context={context} onSelectUser={setSelectedUser} />",
    "<TabRoles users={users} targetContext={viewingContext} onSelectUser={setSelectedUser} />"
)
content = content.replace(
    "<TabDiagnostico users={users} context={context} />",
    "<TabDiagnostico users={users} targetContext={viewingContext} />"
)
content = content.replace(
    "Dados vivos do GLPI — {context.toUpperCase()}",
    "Dados vivos do GLPI — {viewingContext.toUpperCase()} (Routing via {context.toUpperCase()})"
)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("Refatoração de PermissionsMatrix.tsx concluída via script!")
