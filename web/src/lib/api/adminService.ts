import { apiDelete, apiGet, apiPost, buildApiPath, withQuery } from './client';
import { publishLiveDataEvent } from "@/lib/realtime/liveDataBus";

export interface AdminUser {
    id: number;
    username: string;
    realname: string;
    firstname: string;
    profiles: string[];
    groups: string[];
    app_access: string[];
    roles: string[];
}

export interface AssignGroupResponse {
    success: boolean;
    binding_id: number | null;
    message: string;
    already_exists: boolean;
}

export interface RevokeGroupResponse {
    success: boolean;
    message: string;
    user_id: number;
    group_id: number;
}

export interface ModuleCatalogItem {
    group_id: number;
    tag: string;
    group_name: string;
    label: string;
}

/**
 * Busca todos os usuários com seus módulos e roles.
 * O Endpoint no backend consolida dados e atende ao contrato Frontend.
 */
export async function fetchUsersDiagnostics(context: string, targetContext?: string): Promise<AdminUser[]> {
    return apiGet<AdminUser[]>(
        withQuery(buildApiPath(context, "admin/users"), { target_context: targetContext }),
    );
}

export async function fetchModuleCatalog(context: string, targetContext?: string): Promise<ModuleCatalogItem[]> {
    return apiGet<ModuleCatalogItem[]>(
        withQuery(buildApiPath(context, "admin/module-catalog"), { target_context: targetContext }),
    );
}

/**
 * Atribui um grupo Hub-App-* a um usuário.
 */
export async function assignModuleToUser(
    context: string,
    userId: number,
    groupId: number,
    targetContext?: string
): Promise<AssignGroupResponse> {
    const response = await apiPost<AssignGroupResponse, { group_id: number }>(
        withQuery(buildApiPath(context, `admin/users/${userId}/groups`), { target_context: targetContext }),
        { group_id: groupId },
    );
    publishLiveDataEvent({
        context: targetContext || context,
        domains: ["permissions"],
        source: "mutation",
        reason: "permissions-assign",
    });
    return response;
}

/**
 * Revoga um grupo Hub-App-* de um usuário.
 */
export async function revokeModuleFromUser(
    context: string,
    userId: number,
    groupId: number,
    targetContext?: string
): Promise<RevokeGroupResponse> {
    const response = await apiDelete<RevokeGroupResponse>(
        withQuery(buildApiPath(context, `admin/users/${userId}/groups/${groupId}`), { target_context: targetContext }),
    );
    publishLiveDataEvent({
        context: targetContext || context,
        domains: ["permissions"],
        source: "mutation",
        reason: "permissions-revoke",
    });
    return response;
}
