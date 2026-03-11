import { request } from './httpClient';

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

/**
 * Busca todos os usuários com seus módulos e roles.
 * O Endpoint no backend consolida dados e atende ao contrato Frontend.
 */
export async function fetchUsersDiagnostics(context: string, targetContext?: string): Promise<AdminUser[]> {
    const query = targetContext ? `?target_context=${targetContext}` : '';
    return request<AdminUser[]>(`/api/v1/${context}/admin/users${query}`, { method: "GET" });
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
    const query = targetContext ? `?target_context=${targetContext}` : '';
    return request<AssignGroupResponse>(`/api/v1/${context}/admin/users/${userId}/groups${query}`, {
        method: "POST",
        body: JSON.stringify({ group_id: groupId })
    });
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
    const query = targetContext ? `?target_context=${targetContext}` : '';
    return request<RevokeGroupResponse>(`/api/v1/${context}/admin/users/${userId}/groups/${groupId}${query}`, {
        method: "DELETE"
    });
}
