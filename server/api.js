export async function handleApiRequest(req, res, db) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method.toUpperCase();

  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', async () => {
    let parsed;
    try { parsed = body ? JSON.parse(body) : {}; } catch { parsed = {}; }

    const send = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    let currentUser = null;
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          currentUser = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        }
      } catch {}
    }

    function checkPermission(perm) {
      if (!currentUser) return send(401, { error: 'Authentication required.' });
      if (!currentUser.permissions?.includes(perm) && !currentUser.permissions?.includes('*')) {
        send(403, { error: 'Forbidden.' });
        return false;
      }
      return true;
    }

    try {
      if (db.isSupabase) {
        await handleSupabase(db.supabase, path, method, parsed, send, currentUser, token);
      } else {
        await handleMemory(db, path, method, parsed, send, currentUser);
      }
    } catch (err) {
      send(500, { error: 'Internal server error.' });
    }
  });
}

async function handleMemory(db, path, method, parsed, send, currentUser) {
  function checkPermission(perm) {
    if (!currentUser) { send(401, { error: 'Authentication required.' }); return false; }
    if (!currentUser.permissions?.includes(perm) && !currentUser.permissions?.includes('*')) {
      send(403, { error: 'Forbidden.' }); return false;
    }
    return true;
  }

  if (path === '/api/auth/login' && method === 'POST') {
    const user = await db.users.findByEmail(parsed.identifier);
    if (!user) return send(401, { error: 'Invalid credentials.' });
    const { password_hash, ...safe } = user;
    const payload = { id: user.id, role: user.role, permissions: user.permissions || [] };
    const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64');
    const bodyB64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    return send(200, { user: safe, token: `${header}.${bodyB64}.sig` });
  }

  if (path === '/api/auth/register' && method === 'POST') {
    const existing = await db.users.findByEmail(parsed.email);
    if (existing) return send(409, { error: 'Email already registered.' });
    const user = await db.users.create({
      name: parsed.name, email: parsed.email, phone: parsed.phone || '',
      password_hash: parsed.password, role: parsed.role || 'user',
      permissions: [], status: 'active',
    });
    if (!user) return send(500, { error: 'Registration failed.' });
    const { password_hash, ...safe } = user;
    const payload = { id: user.id, role: user.role, permissions: user.permissions || [] };
    const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64');
    const bodyB64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    return send(201, { user: safe, token: `${header}.${bodyB64}.sig`, notice: 'Account created successfully.' });
  }

  if (path === '/api/auth/logout' && method === 'POST') return send(200, { ok: true });
  if (path === '/api/auth/me' && method === 'GET') {
    if (!currentUser) return send(401, { error: 'Not authenticated.' });
    return send(200, { user: currentUser });
  }

  if (method === 'GET' && path === '/api/roles') {
    if (!checkPermission('role:read')) return;
    const roles = await db.roles.findAll(currentUser);
    return send(200, { roles });
  }

  if (method === 'GET' && path.match(/^\/api\/roles\/(.+)$/)) {
    if (!checkPermission('role:read')) return;
    const id = path.match(/^\/api\/roles\/(.+)$/)[1];
    const role = await db.roles.findById(id, currentUser);
    if (!role) return send(404, { error: 'Role not found.' });
    return send(200, { role });
  }

  if (method === 'POST' && path === '/api/roles') {
    if (!checkPermission('role:create')) return;
    const role = await db.roles.create(parsed, currentUser);
    if (!role) return send(500, { error: 'Failed to create role.' });
    return send(201, { role });
  }

  if (method === 'PUT' && path.match(/^\/api\/roles\/(.+)$/)) {
    if (!checkPermission('role:update')) return;
    const id = path.match(/^\/api\/roles\/(.+)$/)[1];
    const role = await db.roles.update(id, parsed, currentUser);
    if (!role) return send(404, { error: 'Role not found.' });
    return send(200, { role });
  }

  if (method === 'DELETE' && path.match(/^\/api\/roles\/(.+)$/)) {
    if (!checkPermission('role:delete')) return;
    const id = path.match(/^\/api\/roles\/(.+)$/)[1];
    const ok = await db.roles.delete(id, currentUser);
    if (!ok) return send(404, { error: 'Role not found.' });
    return send(200, { ok: true });
  }

  if (method === 'GET' && path === '/api/users') {
    if (!checkPermission('user:read')) return;
    const users = await db.users.findAll(currentUser);
    const safe = users.map((u) => { const { password_hash, ...rest } = u; return rest; });
    return send(200, { users: safe });
  }

  if (method === 'GET' && path.match(/^\/api\/users\/(.+)$/)) {
    if (!checkPermission('user:read')) return;
    const id = path.match(/^\/api\/users\/(.+)$/)[1];
    const user = await db.users.findById(id, currentUser);
    if (!user) return send(404, { error: 'User not found.' });
    const { password_hash, ...safe } = user;
    return send(200, { user: safe });
  }

  if (method === 'POST' && path === '/api/users') {
    if (!checkPermission('user:create')) return;
    const existing = await db.users.findByEmail(parsed.email);
    if (existing) return send(409, { error: 'Email already in use.' });
    const user = await db.users.create(parsed, currentUser);
    if (!user) return send(500, { error: 'Failed to create user.' });
    const { password_hash, ...safe } = user;
    return send(201, { user: safe });
  }

  if (method === 'PUT' && path.match(/^\/api\/users\/(.+)$/)) {
    if (!checkPermission('user:update')) return;
    const id = path.match(/^\/api\/users\/(.+)$/)[1];
    const user = await db.users.update(id, parsed, currentUser);
    if (!user) return send(404, { error: 'User not found.' });
    const { password_hash, ...safe } = user;
    return send(200, { user: safe });
  }

  if (method === 'DELETE' && path.match(/^\/api\/users\/(.+)$/)) {
    if (!checkPermission('user:delete')) return;
    const id = path.match(/^\/api\/users\/(.+)$/)[1];
    const ok = await db.users.delete(id, currentUser);
    if (!ok) return send(404, { error: 'User not found.' });
    return send(200, { ok: true });
  }

  if (method === 'GET' && path === '/api/settings') {
    if (!checkPermission('settings:read')) return;
    const settings = await db.settings.getAll();
    return send(200, { settings });
  }

  if (method === 'PUT' && path === '/api/settings') {
    if (!checkPermission('settings:update')) return;
    await db.settings.update(parsed);
    return send(200, { ok: true });
  }

  return send(404, { error: 'Not found.' });
}

async function handleSupabase(supabase, path, method, parsed, send, currentUser) {
  function cp(perm) {
    if (!currentUser) { send(401, { error: 'Authentication required.' }); return false; }
    if (!currentUser.permissions?.includes(perm) && !currentUser.permissions?.includes('*')) {
      send(403, { error: 'Forbidden.' }); return false;
    }
    return true;
  }

  if (path === '/api/auth/login' && method === 'POST') {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.identifier, password: parsed.password,
    });
    if (error) return send(401, { error: error.message });
    return send(200, {
      user: { id: data.user.id, email: data.user.email, role: data.user.user_metadata?.role || 'user', permissions: data.user.user_metadata?.permissions || [] },
      token: data.session.access_token,
    });
  }

  if (path === '/api/auth/register' && method === 'POST') {
    const { data, error } = await supabase.auth.signUp({
      email: parsed.email, password: parsed.password,
      options: { data: { name: parsed.name, phone: parsed.phone, role: parsed.role || 'user', permissions: [] } },
    });
    if (error) return send(400, { error: error.message });
    return send(201, {
      user: { id: data.user.id, email: parsed.email, role: parsed.role || 'user', permissions: [] },
      token: data.session?.access_token || '',
      notice: 'Account created.',
    });
  }

  if (path === '/api/auth/logout' && method === 'POST') {
    await supabase.auth.signOut();
    return send(200, { ok: true });
  }

  if (path === '/api/auth/me' && method === 'GET') {
    const { data } = await supabase.auth.getUser(currentUser?.id ? currentUser.id : undefined);
    if (!data?.user) return send(401, { error: 'Not authenticated.' });
    return send(200, { user: { id: data.user.id, email: data.user.email, role: data.user.user_metadata?.role || 'user', permissions: data.user.user_metadata?.permissions || [] } });
  }

  const adminClient = await adminSupabase();

  if (method === 'GET' && path === '/api/roles') {
    if (!cp('role:read')) return;
    const { data, error } = await adminClient.from('roles').select('*');
    if (error) return send(500, { error: error.message });
    return send(200, { roles: data || [] });
  }

  if (method === 'GET' && path.match(/^\/api\/roles\/(.+)$/)) {
    if (!cp('role:read')) return;
    const id = path.match(/^\/api\/roles\/(.+)$/)[1];
    const { data, error } = await adminClient.from('roles').select('*').eq('id', id).single();
    if (error || !data) return send(404, { error: 'Role not found.' });
    return send(200, { role: data });
  }

  if (method === 'POST' && path === '/api/roles') {
    if (!cp('role:create')) return;
    const { data, error } = await adminClient.from('roles').insert(parsed).select().single();
    if (error) return send(500, { error: error.message });
    return send(201, { role: data });
  }

  if (method === 'PUT' && path.match(/^\/api\/roles\/(.+)$/)) {
    if (!cp('role:update')) return;
    const id = path.match(/^\/api\/roles\/(.+)$/)[1];
    const { data, error } = await adminClient.from('roles').update(parsed).eq('id', id).select().single();
    if (error || !data) return send(404, { error: 'Role not found.' });
    return send(200, { role: data });
  }

  if (method === 'DELETE' && path.match(/^\/api\/roles\/(.+)$/)) {
    if (!cp('role:delete')) return;
    const id = path.match(/^\/api\/roles\/(.+)$/)[1];
    const { error } = await adminClient.from('roles').delete().eq('id', id);
    if (error) return send(500, { error: error.message });
    return send(200, { ok: true });
  }

  if (method === 'GET' && path === '/api/users') {
    if (!cp('user:read')) return;
    const { data, error } = await adminClient.from('users').select('*');
    if (error) return send(500, { error: error.message });
    return send(200, { users: data || [] });
  }

  if (method === 'GET' && path.match(/^\/api\/users\/(.+)$/)) {
    if (!cp('user:read')) return;
    const id = path.match(/^\/api\/users\/(.+)$/)[1];
    const { data, error } = await adminClient.from('users').select('*').eq('id', id).single();
    if (error || !data) return send(404, { error: 'User not found.' });
    return send(200, { user: data });
  }

  if (method === 'POST' && path === '/api/users') {
    if (!cp('user:create')) return;
    const { data, error } = await adminClient.from('users').insert(parsed).select().single();
    if (error) return send(500, { error: error.message });
    return send(201, { user: data });
  }

  if (method === 'PUT' && path.match(/^\/api\/users\/(.+)$/)) {
    if (!cp('user:update')) return;
    const id = path.match(/^\/api\/users\/(.+)$/)[1];
    const { data, error } = await adminClient.from('users').update(parsed).eq('id', id).select().single();
    if (error || !data) return send(404, { error: 'User not found.' });
    return send(200, { user: data });
  }

  if (method === 'DELETE' && path.match(/^\/api\/users\/(.+)$/)) {
    if (!cp('user:delete')) return;
    const id = path.match(/^\/api\/users\/(.+)$/)[1];
    const { error } = await adminClient.from('users').delete().eq('id', id);
    if (error) return send(500, { error: error.message });
    return send(200, { ok: true });
  }

  if (method === 'GET' && path === '/api/settings') {
    if (!cp('settings:read')) return;
    const { data, error } = await adminClient.from('settings').select('*');
    if (error) return send(500, { error: error.message });
    const settings = {};
    (data || []).forEach((row) => { settings[row.key] = row.value; });
    return send(200, { settings });
  }

  if (method === 'PUT' && path === '/api/settings') {
    if (!cp('settings:update')) return;
    for (const [key, value] of Object.entries(parsed)) {
      await adminClient.from('settings').upsert({ key, value }, { onConflict: 'key' });
    }
    return send(200, { ok: true });
  }

  return send(404, { error: 'Not found.' });
}

let _adminSupabase = null;
async function adminSupabase() {
  if (_adminSupabase) return _adminSupabase;
  const { createClient } = await import('@supabase/supabase-js');
  const { config } = await import('../src/config/index.js');
  _adminSupabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _adminSupabase;
}
