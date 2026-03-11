"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    Search, Shield, Users, AlertCircle, RefreshCw,
    Eye, ChevronRight, CheckCircle2, AlertTriangle,
    XCircle, Loader2, User, Package, Settings, X, PlusCircle, MinusCircle
} from 'lucide-react';
import { fetchUsersDiagnostics, assignModuleToUser, revokeModuleFromUser, AdminUser } from '@/lib/api/adminService';

interface MatrixProps {
    context: string;
}

// ─── Role color mapping ───

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    gestor: { bg: 'bg-violet-500/15', text: 'text-violet-400', border: 'border-violet-500/30' },
    tecnico: { bg: 'bg-sky-500/15', text: 'text-sky-400', border: 'border-sky-500/30' },
    'tecnico-manutencao': { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
    'tecnico-conservacao': { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    solicitante: { bg: 'bg-white/[0.06]', text: 'text-text-3/70', border: 'border-white/[0.08]' },
};

const MODULE_LABELS: Record<string, string> = {
    busca: 'Smart Search',
    permissoes: 'Gestão de Acessos',
    carregadores: 'Carregadores',
    'dtic-infra': 'Infraestrutura DTIC',
    'dtic-kpi': 'KPIs DTIC',
    'dtic-metrics': 'Métricas DTIC',
    'sis-dashboard': 'Dashboard SIS',
};

// ─── Module IDs database for Write actions ───
const AVAILABLE_MODULES: Record<string, { id: number; tag: string; label: string }[]> = {
  dtic: [
    { id: 109, tag: 'busca', label: 'Smart Search' },
    { id: 110, tag: 'permissoes', label: 'Gestão de Acessos' }
  ],
  sis: [
    { id: 102, tag: 'busca', label: 'Smart Search' },
    { id: 104, tag: 'carregadores', label: 'Carregadores' }
  ]
};

// ─── Diagnostic logic ───

interface DiagnosticAlert {
    type: 'warning' | 'error' | 'info';
    message: string;
    user?: string;
}

function computeDiagnostics(users: AdminUser[], targetContext: string): DiagnosticAlert[] {
    const alerts: DiagnosticAlert[] = [];

    for (const user of users) {
        const displayName = user.realname
            ? `${user.firstname} ${user.realname}`.trim()
            : user.username;
        const isGestor = user.roles.includes('gestor');
        const hasPermissoesGroup = user.app_access.includes('permissoes');

        // Gestor sem Hub-App-permissoes (Regra aplica-se apenas à DTIC, pois SIS não tem módulo permissoes)
        if (isGestor && !hasPermissoesGroup && targetContext !== 'sis') {
            alerts.push({
                type: 'warning',
                message: `tem role gestor mas não está no grupo Hub-App-permissoes`,
                user: displayName,
            });
        }

        // Tem Hub-App mas perfil não mapeado (fallback solicitante)
        if (user.app_access.length > 0 && user.roles.length === 1 && user.roles[0] === 'solicitante') {
            alerts.push({
                type: 'warning',
                message: `está em grupo(s) Hub-App-* (${user.app_access.join(', ')}) mas perfil como solicitante`,
                user: displayName,
            });
        }
    }


    return alerts;
}

// ─── Sub-components ───

function RoleBadge({ role }: { role: string }) {
    const colors = ROLE_COLORS[role] || ROLE_COLORS.solicitante;
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}>
            {role}
        </span>
    );
}

function StatusBadge({ user, targetContext }: { user: AdminUser, targetContext: string }) {
    const alerts = computeDiagnostics([user], targetContext).filter(a => a.type !== 'info');
    if (alerts.length > 0) {
        return (
             <span className="flex items-center gap-1 text-amber-400 text-[11px] font-medium" title="Possui alertas pendentes">
                 <AlertTriangle size={12} /> Atenção
             </span>
        );
    }
    if (user.app_access.length === 0 && user.roles.length === 1 && user.roles[0] === 'solicitante') {
         return (
             <span className="flex items-center gap-1 text-sky-400 text-[11px] font-medium" title="Acesso básico">
                 <div className="w-1.5 h-1.5 rounded-full bg-sky-400/50" /> Básico
             </span>
         );
    }
    return (
        <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-medium" title="Acessos consistentes">
            <CheckCircle2 size={12} /> Configurado
        </span>
    );
}

function UserAvatar({ user, className = '' }: { user: AdminUser, className?: string }) {
    const initials = (user.firstname?.[0] || '') + (user.realname?.[0] || user.username[0] || '');
    const roleColor = ROLE_COLORS[user.roles[user.roles.length - 1]] || ROLE_COLORS.solicitante;
    return (
        <div className={`flex items-center justify-center font-bold shrink-0 ${roleColor.bg} ${roleColor.text} ${className || 'w-8 h-8 rounded-lg text-[11px]'}`}>
            {initials.toUpperCase() || '?'}
        </div>
    );
}

// ─── Componentes de Lookup Expandido ───

function ModuleChip({ mod, hasAccess, user, routingContext, targetContext, onRefresh }: { mod: typeof AVAILABLE_MODULES[string][0]; hasAccess: boolean; user: AdminUser; routingContext: string; targetContext: string; onRefresh: () => void; }) {
    const [isProcessing, setIsProcessing] = useState(false);

    const handleToggle = async () => {
        const action = hasAccess ? 'Remover' : 'Dar';
        const confirmMsg = `${action} acesso ao módulo '${mod.label}' para ${user.realname || user.username}?`;
        if (!window.confirm(confirmMsg)) return;

        setIsProcessing(true);
        try {
            if (hasAccess) {
                await revokeModuleFromUser(routingContext, user.id, mod.id, targetContext);
            } else {
                await assignModuleToUser(routingContext, user.id, mod.id, targetContext);
            }
            onRefresh();
        } catch (err: any) {
            alert(err.message || 'Erro ao modificar acesso.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <button
            onClick={handleToggle}
            disabled={isProcessing}
            title={hasAccess ? 'Clique para revogar' : 'Clique para atribuir'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all focus:outline-none ${
                hasAccess
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                    : 'bg-white/[0.04] text-text-3/60 border border-white/[0.06] hover:bg-white/[0.08] hover:text-text-2'
            } disabled:opacity-50`}
        >
            {isProcessing ? <Loader2 size={13} className="animate-spin" /> : hasAccess ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
            {mod.label}
        </button>
    );
}

function UserCard({ user, routingContext, targetContext, onClose, onRefresh }: { user: AdminUser; routingContext: string; targetContext: string; onClose: () => void; onRefresh: () => void; }) {
    const contextKey = targetContext.startsWith('sis') ? 'sis' : 'dtic';
    const availableModules = AVAILABLE_MODULES[contextKey] || [];
    const displayName = user.realname ? `${user.firstname} ${user.realname}`.trim() : user.username;
    const highestRole = user.roles[user.roles.length - 1] || 'solicitante';
    const alerts = computeDiagnostics([user], targetContext);

    const [fixingId, setFixingId] = useState<number | null>(null);

    const handleQuickFix = async (alert: DiagnosticAlert) => {
        const permMod = availableModules.find(m => m.tag === 'permissoes');
        if (!permMod) return;
        
        setFixingId(permMod.id);
        try {
            await assignModuleToUser(routingContext, user.id, permMod.id, targetContext);
            onRefresh();
        } catch (err: any) {
            window.alert(err.message || "Erro no quick fix.");
        } finally {
            setFixingId(null);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="flex flex-col w-full h-full animate-in fade-in slide-in-from-top-4 duration-200 relative">
            <button onClick={onClose} className="absolute top-6 right-6 p-2 text-text-3/40 hover:text-text-1 hover:bg-white/[0.06] rounded-xl bg-surface-2 border border-white/[0.04] z-10 transition-colors">
                <X size={20} />
            </button>
            
            {/* Extended Header */}
            <div className="px-8 py-8 border-b border-white/[0.04] flex items-center gap-6">
                 <UserAvatar user={user} className="w-20 h-20 text-2xl rounded-2xl border border-white/[0.06] shadow-xl" />
                 <div>
                    <h2 className="text-2xl font-bold text-text-1 tracking-tight">{displayName}</h2>
                    <p className="text-text-3/60 font-mono text-[13px] mt-1">{user.username}</p>
                    <div className="flex items-center gap-3 mt-4">
                        <RoleBadge role={highestRole} />
                        <span className="text-text-3/40 text-[12px]">{user.profiles.join(', ') || 'Sem perfil GLPI'}</span>
                    </div>
                 </div>
            </div>

            <div className="p-8 space-y-10 flex-1 overflow-y-auto custom-scrollbar">
                <section>
                    <h3 className="text-text-3/50 text-[11px] font-bold tracking-widest uppercase mb-3 px-1 flex items-center gap-2">
                        <Package size={14} /> Módulos ({contextKey.toUpperCase()})
                    </h3>
                    <div className="flex flex-wrap gap-2.5">
                        {availableModules.map(mod => {
                            const hasAccess = user.app_access.includes(mod.tag);
                            return <ModuleChip key={mod.id} mod={mod} hasAccess={hasAccess} user={user} routingContext={routingContext} targetContext={targetContext} onRefresh={onRefresh} />;
                        })}
                    </div>
                </section>

                <section>
                    <h3 className="text-text-3/50 text-[11px] font-bold tracking-widest uppercase mb-3 px-1 flex items-center gap-2">
                        <AlertCircle size={14} /> Diagnóstico Local
                    </h3>
                    {alerts.length > 0 ? (
                        <div className="space-y-3">
                            {alerts.map((alert, i) => (
                                <div key={i} className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                                        <p className="text-amber-400/90 text-[13px]">{alert.message}</p>
                                    </div>
                                    {alert.message.includes('Hub-App-permissoes') && (
                                        <button 
                                            onClick={() => handleQuickFix(alert)}
                                            disabled={fixingId !== null}
                                            className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 text-[12px] font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 whitespace-nowrap"
                                        >
                                            {fixingId ? <Loader2 size={14} className="animate-spin" /> : <Settings size={14} />}
                                            Corrigir agora
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-emerald-400 text-[13px] bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 rounded-xl font-medium">
                            <CheckCircle2 size={16} /> Configuração completa e alinhada.
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

// ─── Hooks Customizados ───
function useClickOutside(ref: React.RefObject<any>, handler: () => void) {
    useEffect(() => {
        const listener = (e: MouseEvent | TouchEvent) => {
            if (!ref.current || ref.current.contains(e.target as Node)) return;
            handler();
        };
        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);
        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [ref, handler]);
}

// ─── Tab: Usuários ───

function TabUsuarios({ users, searchQuery, targetContext, onRefresh, onSelectUser }: { users: AdminUser[]; searchQuery: string; targetContext: string; onRefresh: () => void; onSelectUser: (user: AdminUser) => void }) {
    const [activeFilter, setActiveFilter] = useState<'todos' | 'gestores' | 'tecnicos' | 'com_modulos' | 'com_alertas'>('todos');

    const filtered = useMemo(() => {
        let list = users;

        if (activeFilter === 'gestores') {
            list = list.filter(u => u.roles.includes('gestor'));
        } else if (activeFilter === 'tecnicos') {
            list = list.filter(u => u.roles.some(r => r.startsWith('tecnico')));
        } else if (activeFilter === 'com_modulos') {
            list = list.filter(u => u.app_access.length > 0);
        } else if (activeFilter === 'com_alertas') {
            list = list.filter(u => computeDiagnostics([u], targetContext).length > 0);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(u =>
                u.username.toLowerCase().includes(q) ||
                u.realname?.toLowerCase().includes(q) ||
                u.firstname?.toLowerCase().includes(q) ||
                u.roles.some(r => r.toLowerCase().includes(q))
            );
        }
        return list;
    }, [users, searchQuery, activeFilter, targetContext]);

    const statGest = users.filter(u => u.roles.includes('gestor')).length;
    const statTec = users.filter(u => u.roles.some(r => r.startsWith('tecnico'))).length;
    const statMod = users.filter(u => u.app_access.length > 0).length;
    const statAlert = users.filter(u => computeDiagnostics([u], targetContext).length > 0).length;

    const FILTERS = [
        { id: 'todos', label: 'Todos', count: users.length },
        { id: 'gestores', label: 'Gestores', count: statGest },
        { id: 'tecnicos', label: 'Técnicos', count: statTec },
        { id: 'com_modulos', label: 'Com módulos', count: statMod },
        { id: 'com_alertas', label: 'Com alertas ⚠️', count: statAlert },
    ] as const;

    if (filtered.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-text-3/40 gap-2">
                <Users size={28} />
                <p className="text-sm">Nenhum usuário encontrado para este filtro.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="px-5 py-3 border-b border-white/[0.04] flex gap-2 overflow-x-auto shrink-0 no-scrollbar">
                {FILTERS.map(f => (
                    <button
                        key={f.id}
                        onClick={() => setActiveFilter(f.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide transition-all shrink-0 border ${
                            activeFilter === f.id
                                ? 'bg-white/[0.08] text-text-1 border-white/[0.12]'
                                : 'bg-transparent text-text-3/50 border-transparent hover:bg-white/[0.03] hover:text-text-2'
                        }`}
                    >
                        {f.label} 
                        <span className={`px-1.5 rounded font-mono text-[10px] ${activeFilter === f.id ? 'bg-white/[0.1] text-accent-blue' : 'bg-white/[0.04]'}`}>
                            {f.count}
                        </span>
                    </button>
                ))}
            </div>
            
            <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm text-left relative">
                    <thead className="bg-surface-2 text-text-3/50 uppercase text-[10px] tracking-widest font-bold sticky top-0 z-10 border-b border-white/[0.04] shadow-sm">
                        <tr>
                            <th className="px-5 py-3 font-semibold">Usuário</th>
                            <th className="px-5 py-3 font-semibold hidden md:table-cell">Role</th>
                            <th className="px-5 py-3 font-semibold hidden lg:table-cell">Módulos</th>
                            <th className="px-5 py-3 font-semibold text-center">Status</th>
                            <th className="px-5 py-3 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                        {filtered.map(user => {
                            const displayName = user.realname
                                ? `${user.firstname} ${user.realname}`.trim()
                                : user.username;
                            
                            const visibleModules = user.app_access.slice(0, 2);
                            const extraModules = user.app_access.length - 2;

                            return (
                                <tr key={user.id} onClick={() => onSelectUser(user)} className="hover:bg-white/[0.03] cursor-pointer transition-colors group relative">
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <UserAvatar user={user} />
                                            <div>
                                                <p className="text-text-1 font-medium text-[13px] group-hover:text-accent-blue transition-colors">{displayName}</p>
                                                <p className="text-text-3/40 text-[11px] font-mono">{user.username}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5 hidden md:table-cell">
                                        <div className="flex flex-wrap gap-1">
                                            {user.roles.map(r => <RoleBadge key={r} role={r} />)}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5 hidden lg:table-cell">
                                        <div className="flex flex-wrap gap-1 items-center">
                                            {user.app_access.length > 0 ? (
                                                <>
                                                    {visibleModules.map(a => (
                                                        <span key={a} className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-accent-blue/5 text-accent-blue/80 border border-accent-blue/10">
                                                            {MODULE_LABELS[a] || a}
                                                        </span>
                                                    ))}
                                                    {extraModules > 0 && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-white/[0.05] text-text-3/60 border border-white/[0.06]" title={user.app_access.slice(2).map(a => MODULE_LABELS[a]).join(', ')}>
                                                            +{extraModules}
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-text-3/30 text-[11px] italic">sem módulos</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5 text-center">
                                        <div className="inline-flex items-center justify-center">
                                           <StatusBadge user={user} targetContext={targetContext} />
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                        <ChevronRight size={16} className="text-text-3/30 opacity-0 group-hover:opacity-100 transition-opacity translate-x-1 group-hover:translate-x-0 ml-auto" />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Tab: Módulos ───

function TabModulos({ users }: { users: AdminUser[] }) {
    const modules = useMemo(() => {
        const moduleMap: Record<string, AdminUser[]> = {};
        for (const user of users) {
            for (const app of user.app_access) {
                if (!moduleMap[app]) moduleMap[app] = [];
                moduleMap[app].push(user);
            }
        }
        return Object.entries(moduleMap).sort((a, b) => b[1].length - a[1].length);
    }, [users]);

    if (modules.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-text-3/40 gap-2">
                <Package size={28} />
                <p className="text-sm">Nenhum módulo Hub-App-* encontrado.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {modules.map(([moduleId, moduleUsers]) => (
                <div key={moduleId} className="bg-surface-2 border border-white/[0.06] rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.04]">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-accent-blue/10 flex items-center justify-center">
                                <Package size={16} className="text-accent-blue" />
                            </div>
                            <div>
                                <h3 className="text-text-1 font-semibold text-[14px]">Hub-App-{moduleId}</h3>
                                <p className="text-text-3/50 text-[11px]">{MODULE_LABELS[moduleId] || moduleId}</p>
                            </div>
                        </div>
                        <span className="text-text-3/50 text-[12px] font-mono bg-white/[0.04] px-2.5 py-1 rounded-md">
                            {moduleUsers.length} {moduleUsers.length === 1 ? 'membro' : 'membros'}
                        </span>
                    </div>
                    <div className="px-5 py-3">
                        <div className="flex flex-wrap gap-2">
                            {moduleUsers.map(u => {
                                const name = u.realname ? `${u.firstname} ${u.realname}`.trim() : u.username;
                                const highestRole = u.roles[u.roles.length - 1];
                                return (
                                    <div key={u.id} className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.05] rounded-lg px-3 py-1.5">
                                        <UserAvatar user={u} />
                                        <div>
                                            <p className="text-text-2 text-[12px] font-medium">{name}</p>
                                            <RoleBadge role={highestRole} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Tab: Roles ───

function TabRoles({ users, targetContext, onSelectUser }: { users: AdminUser[]; targetContext: string; onSelectUser: (user: AdminUser) => void }) {
    const contextKey = targetContext.startsWith('sis') ? 'sis' : 'dtic';
    const availableModules = AVAILABLE_MODULES[contextKey] || [];

    const roleGroups = useMemo(() => {
        const map: Record<string, AdminUser[]> = {};
        for (const user of users) {
            const highestRole = user.roles[user.roles.length - 1] || 'solicitante';
            if (!map[highestRole]) map[highestRole] = [];
            map[highestRole].push(user);
        }
        // Order: gestor → tecnico → sub-roles → solicitante
        const order = ['gestor', 'tecnico', 'tecnico-manutencao', 'tecnico-conservacao', 'solicitante'];
        return order
            .filter(r => map[r])
            .map(r => ({ role: r, users: map[r] }));
    }, [users]);

    return (
        <div className="space-y-4">
            {roleGroups.map(({ role, users: roleUsers }) => {
                const colors = ROLE_COLORS[role] || ROLE_COLORS.solicitante;
                return (
                    <div key={role} className="bg-surface-2 border border-white/[0.06] rounded-xl overflow-hidden">
                        <div className={`flex items-center justify-between px-5 py-3 border-b border-white/[0.04] bg-white/[0.01]`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-sm ${colors.bg}`}>
                                    <Shield size={16} className={colors.text} />
                                </div>
                                <div>
                                    <h3 className="text-text-1 font-semibold text-[14px] capitalize">{role}</h3>
                                    <p className="text-text-3/50 text-[11px]">{roleUsers.length} {roleUsers.length === 1 ? 'usuário' : 'usuários'}</p>
                                </div>
                            </div>
                            <RoleBadge role={role} />
                        </div>
                        <div className="px-5 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {roleUsers.map(u => {
                                    const name = u.realname ? `${u.firstname} ${u.realname}`.trim() : u.username;
                                    const alerts = computeDiagnostics([u], targetContext);
                                    
                                    return (
                                        <button 
                                            key={u.id} 
                                            onClick={() => onSelectUser(u)}
                                            className="flex flex-col text-left gap-3 bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all group focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
                                        >
                                            <div className="flex items-center gap-2.5 w-full">
                                                <UserAvatar user={u} className="w-10 h-10 text-[12px] rounded-xl" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-text-1 text-[13px] font-semibold truncate group-hover:text-accent-blue transition-colors">{name}</p>
                                                    <p className="text-text-3/40 text-[11px] truncate">{u.username}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between w-full mt-1 border-t border-white/[0.04] pt-2">
                                                <div className="flex flex-wrap gap-1 items-center">
                                                    {u.profiles.slice(0, 1).map(p => (
                                                        <span key={p} className="text-[9px] font-medium tracking-wide uppercase px-1.5 py-0.5 bg-white/[0.05] text-text-3/50 rounded">{p}</span>
                                                    ))}
                                                    {u.profiles.length > 1 && (
                                                         <span className="text-[9px] font-medium px-1 text-text-3/30">+{u.profiles.length - 1}</span>
                                                    )}
                                                </div>
                                                
                                                <div className="flex items-center gap-1">
                                                    {alerts.length > 0 && <AlertTriangle size={12} className="text-amber-400 mr-1" />}
                                                    {availableModules.slice(0, 4).map(mod => {
                                                        const hasAccess = u.app_access.includes(mod.tag);
                                                        return (
                                                            <div 
                                                                key={mod.id} 
                                                                title={mod.label}
                                                                className={`w-2 h-2 rounded-full border ${
                                                                    hasAccess 
                                                                        ? 'bg-emerald-400/80 border-transparent shadow-[0_0_8px_rgba(52,211,153,0.3)]' 
                                                                        : 'bg-transparent border-white/[0.1]'
                                                                }`} 
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Tab: Diagnóstico ───

function TabDiagnostico({ users, targetContext }: { users: AdminUser[]; targetContext: string }) {
    const alerts = useMemo(() => computeDiagnostics(users, targetContext), [users, targetContext]);

    if (alerts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-emerald-400/60 gap-3">
                <CheckCircle2 size={32} />
                <p className="text-[14px] font-medium">Nenhum problema detectado</p>
                <p className="text-text-3/40 text-[12px]">Todos os usuários estão configurados corretamente.</p>
            </div>
        );
    }

    const ALERT_STYLES = {
        error: { icon: XCircle, bg: 'bg-red-500/8', border: 'border-red-500/20', text: 'text-red-400' },
        warning: { icon: AlertTriangle, bg: 'bg-amber-500/8', border: 'border-amber-500/20', text: 'text-amber-400' },
        info: { icon: AlertCircle, bg: 'bg-sky-500/8', border: 'border-sky-500/20', text: 'text-sky-400' },
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-text-3/50 text-[11px] uppercase tracking-widest font-bold mb-3 px-1">
                <AlertCircle size={13} />
                {alerts.length} {alerts.length === 1 ? 'alerta detectado' : 'alertas detectados'}
            </div>
            {alerts.map((alert, i) => {
                const style = ALERT_STYLES[alert.type];
                const Icon = style.icon;
                return (
                    <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${style.bg} ${style.border}`}>
                        <Icon size={16} className={`${style.text} mt-0.5 shrink-0`} />
                        <p className={`text-[13px] ${style.text}`}>
                            {alert.user && <strong>{alert.user}</strong>}
                            {alert.user && ' — '}
                            {alert.message}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Main Component ───

type TabId = 'usuarios' | 'modulos' | 'roles' | 'diagnostico';

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
    { id: 'usuarios', label: 'Usuários', icon: Users },
    { id: 'modulos', label: 'Módulos', icon: Package },
    { id: 'roles', label: 'Perfis', icon: Shield },
    { id: 'diagnostico', label: 'Diagnóstico', icon: AlertCircle },
];

export function PermissionsMatrix({ context }: MatrixProps) {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<TabId>('usuarios');
    const [viewingContext, setViewingContext] = useState<string>(context.startsWith('sis') ? 'sis' : 'dtic');
    
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    useClickOutside(searchRef, () => setShowSuggestions(false));

    const suggestions = useMemo(() => {
        if (searchQuery.length < 2) return [];
        const q = searchQuery.toLowerCase();
        return users.filter(u => 
            u.username.toLowerCase().includes(q) ||
            u.realname?.toLowerCase().includes(q) ||
            u.firstname?.toLowerCase().includes(q)
        ).slice(0, 5);
    }, [users, searchQuery]);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchUsersDiagnostics(context, viewingContext);
            setUsers(data);
            setSelectedUser(prev => prev ? data.find(u => u.id === prev.id) || null : null);
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar dados de permissões.');
        } finally {
            setLoading(false);
        }
    }, [context, viewingContext]);

    useEffect(() => { loadUsers(); }, [loadUsers]);

    const stats = useMemo(() => {
        const totalUsers = users.length;
        const gestores = users.filter(u => u.roles.includes('gestor')).length;
        const tecnicos = users.filter(u => u.roles.some(r => r.startsWith('tecnico'))).length;
        const alerts = computeDiagnostics(users, viewingContext).filter(a => a.type !== 'info').length;
        return { totalUsers, gestores, tecnicos, alerts };
    }, [users, viewingContext]);

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                                        <h2 className="text-xl lg:text-2xl font-semibold text-text-1 tracking-tight flex items-center gap-2.5">
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
                    </div>
                </div>
                <button
                    onClick={loadUsers}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.05] border border-white/[0.08] text-text-2 rounded-xl hover:bg-white/[0.08] transition-all disabled:opacity-50 text-[13px] font-medium"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Atualizar
                </button>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: 'Total Usuários', value: stats.totalUsers, icon: Users, color: 'text-accent-blue' },
                    { label: 'Gestores', value: stats.gestores, icon: Shield, color: 'text-violet-400' },
                    { label: 'Técnicos', value: stats.tecnicos, icon: Eye, color: 'text-sky-400' },
                    { label: 'Alertas', value: stats.alerts, icon: AlertTriangle, color: stats.alerts > 0 ? 'text-amber-400' : 'text-emerald-400' },
                ].map(card => (
                    <div key={card.label} className="bg-surface-2 border border-white/[0.06] rounded-xl px-4 py-3.5">
                        <div className="flex items-center gap-2 mb-1.5">
                            <card.icon size={14} className={card.color} />
                            <span className="text-text-3/50 text-[11px] uppercase tracking-wider font-semibold">{card.label}</span>
                        </div>
                        <p className={`text-2xl font-bold ${card.color}`}>{loading ? '—' : card.value}</p>
                    </div>
                ))}
            </div>

            {/* Search + Tabs */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center relative z-20">
                <div className="relative flex-1 max-w-md" ref={searchRef}>
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-3/30" size={16} />
                    <input
                        type="text"
                        placeholder="Buscar usuário (ex: alexandre)..."
                        className="w-full bg-surface-2 border border-white/[0.06] rounded-xl py-2.5 pl-10 pr-4 text-[13px] outline-none focus:border-white/[0.12] transition-all text-text-2 placeholder:text-text-3/40"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                    />
                    
                    {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1b1e25] shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-white/[0.08] rounded-xl overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 z-50">
                            {suggestions.map(u => (
                                <button
                                    key={u.id}
                                    onClick={() => {
                                        setSelectedUser(u);
                                        setShowSuggestions(false);
                                        setSearchQuery('');
                                    }}
                                    className="w-full text-left flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.03] hover:bg-white/[0.05] transition-colors last:border-0"
                                >
                                    <UserAvatar user={u} />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-text-1 text-[13px] font-medium truncate">{u.realname ? `${u.firstname} ${u.realname}`.trim() : u.username}</p>
                                        <p className="text-text-3/40 text-[11px] truncate">{u.username}</p>
                                    </div>
                                    <RoleBadge role={u.roles[u.roles.length -1] || 'solicitante'} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex bg-surface-2 border border-white/[0.06] rounded-xl p-1 gap-0.5">
                    {TABS.map(tab => {
                        const isActive = activeTab === tab.id && !selectedUser;
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id); setSelectedUser(null); }}
                                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-medium transition-all ${
                                    isActive
                                        ? 'bg-white/[0.08] text-text-1'
                                        : 'text-text-3/50 hover:text-text-2 hover:bg-white/[0.03]'
                                }`}
                            >
                                <Icon size={13} />
                                <span className="hidden sm:inline">{tab.label}</span>
                                {tab.id === 'diagnostico' && stats.alerts > 0 && (
                                    <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-bold flex items-center justify-center">
                                        {stats.alerts}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-[13px] flex items-center gap-2">
                    <XCircle size={16} />
                    {error}
                </div>
            )}

            {/* Content Area */}
            <div className={`bg-surface-2 border border-white/[0.06] rounded-xl overflow-hidden ${!selectedUser ? 'overflow-y-auto custom-scrollbar max-h-[600px] min-h-[300px]' : 'min-h-[500px]'}`}>
                {loading && !selectedUser ? (
                    <div className="flex flex-col items-center justify-center py-20 text-text-3/40 gap-3">
                        <Loader2 size={28} className="animate-spin" />
                        <p className="text-sm">Carregando permissões...</p>
                    </div>
                ) : selectedUser ? (
                    <UserCard 
                        user={selectedUser} 
                        routingContext={context} 
                        targetContext={viewingContext} 
                        onClose={() => setSelectedUser(null)} 
                        onRefresh={loadUsers} 
                    />
                ) : (
                    <>
                        {activeTab === 'usuarios' && <TabUsuarios users={users} searchQuery={searchQuery} targetContext={viewingContext} onRefresh={loadUsers} onSelectUser={setSelectedUser} />}
                        {activeTab === 'modulos' && <TabModulos users={users} />}
                        {activeTab === 'roles' && <TabRoles users={users} targetContext={viewingContext} onSelectUser={setSelectedUser} />}
                        {activeTab === 'diagnostico' && <TabDiagnostico users={users} targetContext={viewingContext} />}
                    </>
                )}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center text-[11px] text-text-3/30 px-1">
                <span>Dados vivos do GLPI — {viewingContext.toUpperCase()} (Routing via {context.toUpperCase()})</span>
                <span>Fonte de verdade: <strong>hub_role.role</strong> (semântico)</span>
            </div>
        </div>
    );
}
