import crypto from 'crypto';

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
        const handled = await handleInvoiceMemory(db, path, method, parsed, send, currentUser);
        if (!handled) await handleMemory(db, path, method, parsed, send, currentUser);
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
    const stringified = {};
    for (const [key, value] of Object.entries(parsed)) {
      stringified[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
    await db.settings.update(stringified);
    return send(200, { ok: true });
  }

  return send(404, { error: 'Not found.' });
}

// ---------------------------------------------------------------------------
// Invoice domain — memory provider. Mirrors the Supabase handlers below so the
// page is provider-agnostic. Each handler enforces the centralized permission
// constants server-side (defense in depth on top of client PermissionGate).
// ---------------------------------------------------------------------------
async function handleInvoiceMemory(db, path, method, parsed, send, currentUser) {
  const PERM = {
    CUSTOMER_READ: 'customer:read', CUSTOMER_CREATE: 'customer:create', CUSTOMER_UPDATE: 'customer:update',
    PRODUCT_READ: 'product:read', PRODUCT_CREATE: 'product:create', PRODUCT_UPDATE: 'product:update',
    INVOICE_READ: 'invoice:read', INVOICE_CREATE: 'invoice:create', INVOICE_UPDATE: 'invoice:update', INVOICE_DELETE: 'invoice:delete',
  };
  const cp = (perm) => {
    if (!currentUser) { send(401, { error: 'Authentication required.' }); return false; }
    if (!currentUser.permissions?.includes(perm) && !currentUser.permissions?.includes('*') && !currentUser.full_access) {
      send(403, { error: 'Forbidden.' }); return false;
    }
    return true;
  };

  // Does this request belong to the invoice domain at all? If not, return
  // false so the dispatcher falls through to the generic memory handlers.
  const isCustomer = path === '/api/customers' || path.startsWith('/api/customers/');
  const isProduct = path === '/api/products' || path.startsWith('/api/products/');
  const isBank = path === '/api/banks' || path.startsWith('/api/banks/');
  const isSignature = path === '/api/signatures' || path.startsWith('/api/signatures/');
  const isInvoice = path === '/api/invoices' || path.startsWith('/api/invoices/');
  if (!isCustomer && !isProduct && !isBank && !isSignature && !isInvoice) return false;

  // Repositories are optional in the memory provider; if the domain store
  // isn't wired (e.g. running purely against Supabase), signal not-found
  // rather than crashing on undefined method calls.
  const have = db.customers && db.products && db.productCategories && db.banks && db.signatures && db.invoices;
  if (!have) { send(404, { error: 'Invoice domain not available on this provider.' }); return true; }

  if (path === '/api/customers' && method === 'GET') {
    if (!cp(PERM.CUSTOMER_READ)) return true;
    send(200, { customers: (await db.customers.findAll(currentUser)).filter(Boolean) });
  } else if (path === '/api/customers' && method === 'POST') {
    if (!cp(PERM.CUSTOMER_CREATE)) return true;
    send(201, { customer: await db.customers.create({ ...parsed, created_by: currentUser.id }, currentUser) });
  } else if (method === 'PUT' && path.startsWith('/api/customers/')) {
    if (!cp(PERM.CUSTOMER_UPDATE)) return true;
    const c = await db.customers.update(path.split('/').pop(), parsed, currentUser);
    if (!c) send(404, { error: 'Customer not found.' }); else send(200, { customer: c });
  } else if (path === '/api/products' && method === 'GET') {
    if (!cp(PERM.PRODUCT_READ)) return true;
    send(200, { products: (await db.products.findAll(currentUser)).filter(Boolean), categories: (await db.productCategories.findAll(currentUser)).filter(Boolean) });
  } else if (path === '/api/products' && method === 'POST') {
    if (!cp(PERM.PRODUCT_CREATE)) return true;
    send(201, { product: await db.products.create({ ...parsed, created_by: currentUser.id }, currentUser) });
  } else if (method === 'PUT' && path.startsWith('/api/products/')) {
    if (!cp(PERM.PRODUCT_UPDATE)) return true;
    const p = await db.products.update(path.split('/').pop(), parsed, currentUser);
    if (!p) send(404, { error: 'Product not found.' }); else send(200, { product: p });
  } else if (path === '/api/banks' && method === 'GET') {
    if (!cp(PERM.INVOICE_READ)) return true;
    send(200, { banks: (await db.banks.findAll(currentUser)).filter(Boolean) });
  } else if (path === '/api/banks' && method === 'POST') {
    if (!cp(PERM.INVOICE_CREATE)) return true;
    send(201, { bank: await db.banks.create({ ...parsed, created_by: currentUser.id }, currentUser) });
  } else if (method === 'PUT' && path.startsWith('/api/banks/')) {
    if (!cp(PERM.INVOICE_UPDATE)) return true;
    const b = await db.banks.update(path.split('/').pop(), parsed, currentUser);
    if (!b) send(404, { error: 'Bank not found.' }); else send(200, { bank: b });
  } else if (method === 'DELETE' && path.startsWith('/api/banks/')) {
    if (!cp(PERM.INVOICE_DELETE)) return true;
    await db.banks.delete(path.split('/').pop(), currentUser);
    send(200, { ok: true });
  } else if (path === '/api/signatures' && method === 'GET') {
    if (!cp(PERM.INVOICE_READ)) return true;
    send(200, { signatures: (await db.signatures.findAll(currentUser)).filter(Boolean) });
  } else if (path === '/api/signatures' && method === 'POST') {
    if (!cp(PERM.INVOICE_CREATE)) return true;
    send(201, { signature: await db.signatures.create({ ...parsed, created_by: currentUser.id }, currentUser) });
  } else if (method === 'DELETE' && path.startsWith('/api/signatures/')) {
    if (!cp(PERM.INVOICE_DELETE)) return true;
    await db.signatures.delete(path.split('/').pop(), currentUser);
    send(200, { ok: true });
  } else if (path === '/api/invoices/next-number' && method === 'GET') {
    if (!cp(PERM.INVOICE_READ)) return true;
    send(200, { number: await db.invoices.nextNumber(parsed.prefix, currentUser) });
  } else if (path === '/api/invoices' && method === 'GET') {
    if (!cp(PERM.INVOICE_READ)) return true;
    send(200, { invoices: await db.invoices.findAll(currentUser) });
  } else if (path === '/api/invoices' && method === 'POST') {
    if (!cp(PERM.INVOICE_CREATE)) return true;
    const result = await db.invoices.save({ ...parsed, created_by: currentUser.id }, currentUser);
    if (!result.ok) send(409, { error: result.error }); else send(201, { invoice: result.invoice });
  } else if (method === 'GET' && path.startsWith('/api/invoices/')) {
    if (!cp(PERM.INVOICE_READ)) return true;
    const inv = await db.invoices.findById(path.split('/').pop(), currentUser);
    if (!inv) send(404, { error: 'Invoice not found.' }); else send(200, { invoice: inv });
  } else if (method === 'PUT' && path.startsWith('/api/invoices/')) {
    if (!cp(PERM.INVOICE_UPDATE)) return true;
    const result = await db.invoices.save(parsed, currentUser);
    if (!result.ok) send(409, { error: result.error }); else send(200, { invoice: result.invoice });
  } else if (method === 'DELETE' && path.startsWith('/api/invoices/')) {
    if (!cp(PERM.INVOICE_DELETE)) return true;
    await db.invoices.delete(path.split('/').pop(), currentUser);
    send(200, { ok: true });
  } else {
    send(404, { error: 'Not found.' });
  }
  return true;
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
      const { error } = await adminClient.from('settings').upsert(
        { key, value: typeof value === 'string' ? value : JSON.stringify(value) },
        { onConflict: 'key' }
      );
      if (error) return send(500, { error: error.message });
    }
    return send(200, { ok: true });
  }

  // ===== Invoice domain (Supabase) =====
  // All writes stamp created_by with the authenticated user so RLS owner
  // policies apply. Permission checks are defense-in-depth on top of the
  // client PermissionGate.
  const uid = currentUser?.id;
  const withCreator = (row) => ({ ...row, created_by: row.created_by || uid });
  const clean = (row) => { if (!row) return row; const { items, payments, ...rest } = row; return { ...rest }; };

  if (method === 'GET' && path === '/api/customers') {
    if (!cp('customer:read')) return;
    const { data, error } = await adminClient.from('customers').select('*').order('created_at', { ascending: false });
    if (error) return send(500, { error: error.message });
    return send(200, { customers: data || [] });
  }
  if (method === 'POST' && path === '/api/customers') {
    if (!cp('customer:create')) return;
    const { data, error } = await adminClient.from('customers').insert(withCreator(parsed)).select().single();
    if (error) return send(500, { error: error.message });
    return send(201, { customer: data });
  }
  if (method === 'PUT' && path.match(/^\/api\/customers\/(.+)$/)) {
    if (!cp('customer:update')) return;
    const id = path.match(/^\/api\/customers\/(.+)$/)[1];
    const { data, error } = await adminClient.from('customers').update(parsed).eq('id', id).select().single();
    if (error || !data) return send(404, { error: 'Customer not found.' });
    return send(200, { customer: data });
  }

  if (method === 'GET' && path === '/api/products') {
    if (!cp('product:read')) return;
    const [pr, cr] = await Promise.all([
      adminClient.from('products').select('*, category:product_categories(id,name)').order('created_at', { ascending: false }),
      adminClient.from('product_categories').select('*').order('name', { ascending: true }),
    ]);
    if (pr.error) return send(500, { error: pr.error.message });
    return send(200, { products: pr.data || [], categories: cr.data || [] });
  }
  if (method === 'POST' && path === '/api/products') {
    if (!cp('product:create')) return;
    const { data, error } = await adminClient.from('products').insert(withCreator(parsed)).select().single();
    if (error) return send(500, { error: error.message });
    return send(201, { product: data });
  }
  if (method === 'PUT' && path.match(/^\/api\/products\/(.+)$/)) {
    if (!cp('product:update')) return;
    const id = path.match(/^\/api\/products\/(.+)$/)[1];
    const { data, error } = await adminClient.from('products').update(parsed).eq('id', id).select().single();
    if (error || !data) return send(404, { error: 'Product not found.' });
    return send(200, { product: data });
  }

  if (method === 'GET' && path === '/api/banks') {
    if (!cp('invoice:read')) return;
    const { data, error } = await adminClient.from('banks').select('*').order('created_at', { ascending: false });
    if (error) return send(500, { error: error.message });
    return send(200, { banks: data || [] });
  }
  if (method === 'POST' && path === '/api/banks') {
    if (!cp('invoice:create')) return;
    // Single default: clear other defaults when this one is marked default.
    if (parsed.is_default) await adminClient.from('banks').update({ is_default: false }).neq('id', '00000000-0000-0000-0000-000000000000');
    const { data, error } = await adminClient.from('banks').insert(withCreator(parsed)).select().single();
    if (error) return send(500, { error: error.message });
    return send(201, { bank: data });
  }
  if (method === 'PUT' && path.match(/^\/api\/banks\/(.+)$/)) {
    if (!cp('invoice:update')) return;
    const id = path.match(/^\/api\/banks\/(.+)$/)[1];
    if (parsed.is_default) await adminClient.from('banks').update({ is_default: false }).neq('id', id);
    const { data, error } = await adminClient.from('banks').update(parsed).eq('id', id).select().single();
    if (error || !data) return send(404, { error: 'Bank not found.' });
    return send(200, { bank: data });
  }
  if (method === 'DELETE' && path.match(/^\/api\/banks\/(.+)$/)) {
    if (!cp('invoice:delete')) return;
    const id = path.match(/^\/api\/banks\/(.+)$/)[1];
    const { error } = await adminClient.from('banks').delete().eq('id', id);
    if (error) return send(500, { error: error.message });
    return send(200, { ok: true });
  }

  if (method === 'GET' && path === '/api/signatures') {
    if (!cp('invoice:read')) return;
    const { data, error } = await adminClient.from('signatures').select('*').order('created_at', { ascending: false });
    if (error) return send(500, { error: error.message });
    return send(200, { signatures: data || [] });
  }
  if (method === 'POST' && path === '/api/signatures') {
    if (!cp('invoice:create')) return;
    if (parsed.is_default) await adminClient.from('signatures').update({ is_default: false }).neq('id', '00000000-0000-0000-0000-000000000000');
    const { data, error } = await adminClient.from('signatures').insert(withCreator(parsed)).select().single();
    if (error) return send(500, { error: error.message });
    return send(201, { signature: data });
  }
  if (method === 'DELETE' && path.match(/^\/api\/signatures\/(.+)$/)) {
    if (!cp('invoice:delete')) return;
    const id = path.match(/^\/api\/signatures\/(.+)$/)[1];
    const { error } = await adminClient.from('signatures').delete().eq('id', id);
    if (error) return send(500, { error: error.message });
    return send(200, { ok: true });
  }

  // ===== Invoice domain business logic helpers =====
  async function createAuditLog(tableName, recordId, action, oldValues, newValues, changedBy) {
    try {
      await adminClient.from('audit_logs').insert({
        id: crypto.randomUUID(), table_name: tableName, record_id: String(recordId),
        action, old_values: oldValues ? JSON.stringify(oldValues) : null,
        new_values: newValues ? JSON.stringify(newValues) : null,
        changed_by: changedBy || uid, ip_address: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '',
        created_at: new Date().toISOString(),
      });
    } catch {}
  }

  async function createAccountingEntries(invoiceId, payload) {
    const entries = [];
    // Debit: Accounts Receivable
    entries.push({ id: crypto.randomUUID(), invoice_id: invoiceId, entry_type: 'debit', account_name: 'Accounts Receivable', amount: payload.grand_total || 0, description: `Invoice ${payload.invoice_number}`, created_at: new Date().toISOString() });
    // Credit: Sales / Income
    entries.push({ id: crypto.randomUUID(), invoice_id: invoiceId, entry_type: 'credit', account_name: 'Sales Income', amount: payload.subtotal || 0, description: `Invoice ${payload.invoice_number} - Subtotal`, created_at: new Date().toISOString() });
    // Credit: Tax (CGST+SGST or IGST)
    if (payload.cgst_total > 0) {
      entries.push({ id: crypto.randomUUID(), invoice_id: invoiceId, entry_type: 'credit', account_name: 'CGST Payable', amount: payload.cgst_total, description: `Invoice ${payload.invoice_number}`, created_at: new Date().toISOString() });
    }
    if (payload.sgst_total > 0) {
      entries.push({ id: crypto.randomUUID(), invoice_id: invoiceId, entry_type: 'credit', account_name: 'SGST Payable', amount: payload.sgst_total, description: `Invoice ${payload.invoice_number}`, created_at: new Date().toISOString() });
    }
    if (payload.igst_total > 0) {
      entries.push({ id: crypto.randomUUID(), invoice_id: invoiceId, entry_type: 'credit', account_name: 'IGST Payable', amount: payload.igst_total, description: `Invoice ${payload.invoice_number}`, created_at: new Date().toISOString() });
    }
    // Credit: Additional Charges
    if (payload.additional_charges_total > 0) {
      entries.push({ id: crypto.randomUUID(), invoice_id: invoiceId, entry_type: 'credit', account_name: 'Other Charges', amount: payload.additional_charges_total, description: `Invoice ${payload.invoice_number}`, created_at: new Date().toISOString() });
    }
    if (entries.length) await adminClient.from('accounting_entries').insert(entries);
  }

  async function deleteAccountingEntries(invoiceId) {
    await adminClient.from('accounting_entries').delete().eq('invoice_id', invoiceId);
  }

  async function updateProductStock(items, sign) {
    // sign: -1 to reduce stock (reserve), +1 to restore
    for (const item of items) {
      if (!item.product_id) continue;
      const qty = Number(item.quantity) || 0;
      if (qty <= 0) continue;
      await adminClient.rpc('exec_sql', {
        query_text: `UPDATE products SET stock_quantity = GREATEST(0, stock_quantity ${sign < 0 ? '-' : '+'} ${qty}) WHERE id = '${item.product_id}'`,
      }).catch(() => {});
    }
  }

  async function updateCustomerBalance(customerId, deltaGrandTotal, deltaPaid) {
    if (!customerId) return;
    const g = Number(deltaGrandTotal) || 0;
    const p = Number(deltaPaid) || 0;
    const balDelta = g - p;
    if (balDelta === 0 && g === 0) return;
    await adminClient.rpc('exec_sql', {
      query_text: `UPDATE customers SET outstanding_balance = GREATEST(0, outstanding_balance ${balDelta >= 0 ? '+' : '-'} ${Math.abs(balDelta)}), total_purchases = GREATEST(0, total_purchases ${g >= 0 ? '+' : '-'} ${Math.abs(g)}) WHERE id = '${customerId}'`,
    }).catch(() => {});
  }

  function computeInvoiceStatus(invoice) {
    const total = Number(invoice.grand_total) || 0;
    const paid = Number(invoice.amount_paid) || 0;
    const due = invoice.due_date ? new Date(invoice.due_date) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (invoice.status === 'cancelled' || invoice.status === 'refunded' || invoice.status === 'void') return invoice.status;
    if (paid >= total && total > 0) return 'paid';
    if (paid > 0 && paid < total) return 'partially_paid';
    if (invoice.status === 'sent' && due && due < today) return 'overdue';
    if (invoice.status === 'pending' && due && due < today) return 'overdue';
    if (invoice.status === 'partially_paid' && due && due < today) return 'overdue';
    return invoice.status || 'draft';
  }

  if (method === 'GET' && path === '/api/invoices/next-number') {
    if (!cp('invoice:read')) return;
    const prefix = (parsed.prefix || 'INV');
    const { data } = await adminClient.from('invoices').select('invoice_number').like('invoice_number', `${prefix}%`).order('invoice_number', { ascending: false }).limit(1);
    const next = nextInvoiceNumber(prefix, data?.[0]?.invoice_number);
    return send(200, { number: next });
  }
  if (method === 'GET' && path === '/api/invoices') {
    if (!cp('invoice:read')) return;
    const { data, error } = await adminClient.from('invoices').select('*, customer:customers(id,name,company)').order('created_at', { ascending: false });
    if (error) return send(500, { error: error.message });
    return send(200, { invoices: data || [] });
  }
  if (method === 'POST' && path === '/api/invoices') {
    if (!cp('invoice:create')) return;
    const { items, payments, ...invoiceRow } = parsed;
    // Uniqueness check before insert
    const { data: dup } = await adminClient.from('invoices').select('id').eq('invoice_number', invoiceRow.invoice_number).limit(1);
    if (dup && dup.length) return send(409, { error: 'Invoice number already exists.' });

    // Auto-compute status: draft stays draft, others check payments
    const totalPaid = (payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    let status = invoiceRow.status || 'draft';
    if (status !== 'draft' && totalPaid > 0) {
      const total = Number(invoiceRow.grand_total) || 0;
      status = totalPaid >= total ? 'paid' : 'partially_paid';
    }
    invoiceRow.status = status;
    invoiceRow.amount_paid = totalPaid;
    invoiceRow.balance_due = Math.max(0, (Number(invoiceRow.grand_total) || 0) - totalPaid);

    const { data: inv, error: ie } = await adminClient.from('invoices').insert(withCreator(invoiceRow)).select().single();
    if (ie) return send(500, { error: ie.message });
    if (items?.length) await adminClient.from('invoice_items').insert(items.map((it, i) => ({ ...it, invoice_id: inv.id, sort_order: it.sort_order ?? i })));
    if (payments?.length) await adminClient.from('invoice_payments').insert(payments.map((p) => ({ ...p, invoice_id: inv.id, created_by: uid })));

    // Business logic side effects
    await Promise.all([
      updateProductStock(items || [], -1),
      updateCustomerBalance(invoiceRow.customer_id, invoiceRow.grand_total, totalPaid),
      createAccountingEntries(inv.id, invoiceRow),
      createAuditLog('invoices', inv.id, 'created', null, invoiceRow, uid),
    ]);

    return send(201, { invoice: inv, status });
  }
  if (method === 'GET' && path.match(/^\/api\/invoices\/([0-9a-fA-F-]+)$/)) {
    if (!cp('invoice:read')) return;
    const id = path.match(/^\/api\/invoices\/([0-9a-fA-F-]+)$/)[1];
    const [ir, items, pays] = await Promise.all([
      adminClient.from('invoices').select('*, customer:customers(*)').eq('id', id).single(),
      adminClient.from('invoice_items').select('*').eq('invoice_id', id).order('sort_order', { ascending: true }),
      adminClient.from('invoice_payments').select('*').eq('invoice_id', id).order('created_at', { ascending: true }),
    ]);
    if (ir.error || !ir.data) return send(404, { error: 'Invoice not found.' });
    const invoice = { ...ir.data, items: items.data || [], payments: pays.data || [] };
    invoice.status = computeInvoiceStatus(invoice);
    return send(200, { invoice });
  }
  if (method === 'PUT' && path.match(/^\/api\/invoices\/([0-9a-fA-F-]+)$/)) {
    if (!cp('invoice:update')) return;
    const id = path.match(/^\/api\/invoices\/([0-9a-fA-F-]+)$/)[1];
    const { items, payments, ...invoiceRow } = parsed;
    const { data: dup } = await adminClient.from('invoices').select('id').eq('invoice_number', invoiceRow.invoice_number).neq('id', id).limit(1);
    if (dup && dup.length) return send(409, { error: 'Invoice number already exists.' });

    // Fetch old invoice for side-effect reversal
    const { data: oldInv } = await adminClient.from('invoices').select('*, items:invoice_items(*)').eq('id', id).single();
    if (!oldInv) return send(404, { error: 'Invoice not found.' });
    const oldItems = oldInv.items || [];
    const oldGrandTotal = Number(oldInv.grand_total) || 0;
    const oldAmountPaid = Number(oldInv.amount_paid) || 0;

    // Auto-compute status
    const totalPaid = (payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    let status = invoiceRow.status || oldInv.status || 'draft';
    if (status !== 'draft' && status !== 'cancelled') {
      const total = Number(invoiceRow.grand_total) || 0;
      status = totalPaid >= total ? 'paid' : (totalPaid > 0 ? 'partially_paid' : status);
    }
    invoiceRow.status = status;
    invoiceRow.amount_paid = totalPaid;
    invoiceRow.balance_due = Math.max(0, (Number(invoiceRow.grand_total) || 0) - totalPaid);

    const { data: inv, error: ie } = await adminClient.from('invoices').update(clean(invoiceRow)).eq('id', id).select().single();
    if (ie || !inv) return send(404, { error: 'Invoice not found.' });
    if (items) {
      await adminClient.from('invoice_items').delete().eq('invoice_id', id);
      if (items.length) await adminClient.from('invoice_items').insert(items.map((it, i) => ({ ...it, invoice_id: id, sort_order: it.sort_order ?? i })));
    }
    if (payments) {
      await adminClient.from('invoice_payments').delete().eq('invoice_id', id);
      if (payments.length) await adminClient.from('invoice_payments').insert(payments.map((p) => ({ ...p, invoice_id: id, created_by: p.created_by || uid })));
    }

    // Business logic: reverse old effects, apply new effects
    await Promise.all([
      updateProductStock(oldItems, 1),      // restore old stock
      updateProductStock(items || [], -1),  // reserve new stock
      updateCustomerBalance(invoiceRow.customer_id, invoiceRow.grand_total, totalPaid),
      deleteAccountingEntries(id),
      createAccountingEntries(id, invoiceRow),
      createAuditLog('invoices', id, 'updated', oldInv, invoiceRow, uid),
    ]);

    return send(200, { invoice: inv, status });
  }
  if (method === 'DELETE' && path.match(/^\/api\/invoices\/([0-9a-fA-F-]+)$/)) {
    if (!cp('invoice:delete')) return;
    const id = path.match(/^\/api\/invoices\/([0-9a-fA-F-]+)$/)[1];

    // Fetch invoice with items for side-effect reversal
    const { data: oldInv } = await adminClient.from('invoices').select('*, items:invoice_items(*)').eq('id', id).single();
    if (!oldInv) return send(404, { error: 'Invoice not found.' });
    if (oldInv.status === 'paid') return send(409, { error: 'Cannot delete a paid invoice. Cancel or refund instead.' });
    if (oldInv.status === 'refunded' || oldInv.status === 'void') return send(409, { error: 'Invoice already finalized.' });
    const oldItems = oldInv.items || [];

    const { error } = await adminClient.from('invoices').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id);
    if (error) return send(500, { error: error.message });

    // Soft-delete: restore stock, reverse customer balance, void accounting
    await Promise.all([
      updateProductStock(oldItems, 1),
      updateCustomerBalance(oldInv.customer_id, -oldInv.grand_total, -oldInv.amount_paid),
      deleteAccountingEntries(id),
      createAuditLog('invoices', id, 'cancelled', oldInv, { status: 'cancelled' }, uid),
    ]);

    return send(200, { ok: true, status: 'cancelled' });
  }

  return send(404, { error: 'Not found.' });
}

// Shared invoice-number sequence helper. Increments the numeric tail of the
// last invoice number that shares the same prefix (e.g. INV-0007 -> INV-0008).
function nextInvoiceNumber(prefix, lastNumber) {
  const PAD = 4;
  let seq = 1;
  if (lastNumber) {
    const tail = String(lastNumber).replace(prefix, '');
    const n = parseInt(tail.replace(/\D/g, ''), 10);
    if (!Number.isNaN(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(PAD, '0')}`;
}

let _adminSupabase = null;
async function adminSupabase() {
  if (_adminSupabase) return _adminSupabase;
  const { createClient } = await import('@supabase/supabase-js');
  const { config } = await import('../src/config/index.js');
  // The service role key is a full-admin secret and must NEVER be read from
  // the client bundle. It comes exclusively from the deployment platform's
  // process.env via the server-only accessor. See src/config/serverSecrets.js.
  const { getSupabaseServiceRoleKey } = await import('../src/config/serverSecrets.js');
  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (!serviceRoleKey) {
    throw new Error('Supabase service role key is not configured on the server (process.env.SUPABASE_SERVICE_ROLE_KEY). Administrative API operations require it.');
  }
  _adminSupabase = createClient(config.supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _adminSupabase;
}
