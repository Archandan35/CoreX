const MANIFEST = {
    version: '1.3.0',
    tables: ['users', 'roles', 'permissions', 'settings', 'audit_logs', 'sessions', 'notifications'],
    functions: ['is_first_install', 'has_admin_user', 'check_permission', 'hash_password', 'update_timestamp', 'function_exists', 'is_admin'],
    triggers: [
        { name: 'set_updated_at', table: 'users' },
        { name: 'audit_log_insert', table: 'audit_logs' },
    ],
    policies: [
        { name: 'users_select', table: 'users' },
        { name: 'users_insert', table: 'users' },
        { name: 'users_update', table: 'users' },
        { name: 'users_delete', table: 'users' },
    ],
    indexes: [
        { name: 'idx_users_role', table: 'users' },
        { name: 'idx_users_status', table: 'users' },
        { name: 'idx_roles_code', table: 'roles' },
        { name: 'idx_roles_system', table: 'roles' },
        { name: 'idx_permissions_category', table: 'permissions' },
        { name: 'idx_audit_logs_user_id', table: 'audit_logs' },
        { name: 'idx_audit_logs_action', table: 'audit_logs' },
        { name: 'idx_audit_logs_created_at', table: 'audit_logs' },
        { name: 'idx_sessions_token', table: 'sessions' },
        { name: 'idx_sessions_expires_at', table: 'sessions' },
        { name: 'idx_notifications_user_id', table: 'notifications' },
        { name: 'idx_notifications_read', table: 'notifications' },
        { name: 'idx_notifications_created_at', table: 'notifications' },
    ],
    columns: {
        users: ['id', 'email', 'name', 'password', 'role', 'permissions', 'status', 'created_at', 'updated_at'],
        roles: ['id', 'code', 'name', 'description', 'permissions', 'all', 'inherits', 'system', 'status', 'created_at', 'updated_at'],
        permissions: ['id', 'code', 'label', 'category', 'created_at'],
        settings: ['key', 'value', 'updated_at'],
        audit_logs: ['id', 'action', 'module', 'user_id', 'details', 'ip_address', 'created_at'],
        sessions: ['id', 'user_id', 'token', 'expires_at', 'created_at'],
        notifications: ['id', 'user_id', 'title', 'body', 'read', 'created_at'],
    },
    extensions: ['pgcrypto', 'uuid-ossp'],
};

async function checkTableExists(baseUrl, serviceKey, table) {
    const res = await fetch(`${baseUrl}/rest/v1/${table}?limit=0`, {
        headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
        },
    });
    return res.ok || res.status === 416;
}

// Try function_exists RPC — only works if granted to anon
async function checkFunctionViaRpc(baseUrl, serviceKey, fnName) {
    try {
        const res = await fetch(`${baseUrl}/rest/v1/rpc/function_exists`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({ func_name: fnName }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data === true;
    } catch {
        return null;
    }
}

export async function onRequest(context) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (context.request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (context.request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
    }

    try {
        const config = await context.request.json();
        const { url, serviceKey } = config;

        if (!url || !serviceKey) {
            return new Response(JSON.stringify({ error: 'Missing url or serviceKey' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
        }

        const baseUrl = url.replace(/\/$/, '');

        const allIndexNames = MANIFEST.indexes.map(i => i.name);
        const allTriggerNames = MANIFEST.triggers.map(t => t.name);
        const allPolicyNames = MANIFEST.policies.map(p => p.name);
        const allColumnKeys = Object.entries(MANIFEST.columns).flatMap(([t, cols]) => cols.map(c => `${t}.${c}`));

        const result = {
            provider: 'postgresql',
            schemaVersion: MANIFEST.version,
            extensions: MANIFEST.extensions,
            existing: { tables: [], functions: [], triggers: [], policies: [], indexes: [], columns: [] },
            missing: {
                tables: [...MANIFEST.tables],
                functions: [...MANIFEST.functions],
                triggers: [...allTriggerNames],
                policies: [...allPolicyNames],
                indexes: [...allIndexNames],
                columns: [...allColumnKeys],
            },
            totalComponents: 0,
            installedComponents: 0,
        };

        // Check tables — infer triggers/policies/indexes/columns from table existence
        await Promise.all(MANIFEST.tables.map(async (table) => {
            const exists = await checkTableExists(baseUrl, serviceKey, table);
            if (exists) {
                result.existing.tables.push(table);
                result.missing.tables = result.missing.tables.filter(t => t !== table);

                for (const col of (MANIFEST.columns[table] || [])) {
                    const key = `${table}.${col}`;
                    result.existing.columns.push(key);
                    result.missing.columns = result.missing.columns.filter(c => c !== key);
                }
                for (const idx of MANIFEST.indexes.filter(i => i.table === table)) {
                    result.existing.indexes.push(idx.name);
                    result.missing.indexes = result.missing.indexes.filter(i => i !== idx.name);
                }
                for (const trg of MANIFEST.triggers.filter(t => t.table === table)) {
                    result.existing.triggers.push(trg.name);
                    result.missing.triggers = result.missing.triggers.filter(t => t !== trg.name);
                }
                for (const pol of MANIFEST.policies.filter(p => p.table === table)) {
                    result.existing.policies.push(pol.name);
                    result.missing.policies = result.missing.policies.filter(p => p !== pol.name);
                }
            }
        }));

        // Check functions:
        // 1. Try function_exists RPC (works if granted to anon)
        // 2. If all tables exist, assume functions are installed (they're deployed together)
        const allTablesExist = result.existing.tables.length === MANIFEST.tables.length;

        await Promise.all(MANIFEST.functions.map(async (fn) => {
            // Try via function_exists RPC first
            const rpcResult = await checkFunctionViaRpc(baseUrl, serviceKey, fn);
            if (rpcResult === true) {
                result.existing.functions.push(fn);
                result.missing.functions = result.missing.functions.filter(f => f !== fn);
            } else if (rpcResult === null && allTablesExist) {
                // function_exists not callable (not granted to anon) but all tables exist
                // — safe to infer functions were installed with the schema
                result.existing.functions.push(fn);
                result.missing.functions = result.missing.functions.filter(f => f !== fn);
            }
        }));

        result.totalComponents =
            MANIFEST.tables.length +
            MANIFEST.functions.length +
            MANIFEST.triggers.length +
            MANIFEST.policies.length +
            MANIFEST.indexes.length +
            allColumnKeys.length;

        result.installedComponents =
            result.existing.tables.length +
            result.existing.functions.length +
            result.existing.triggers.length +
            result.existing.policies.length +
            result.existing.indexes.length +
            result.existing.columns.length;

        return new Response(JSON.stringify(result), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
    }
}
