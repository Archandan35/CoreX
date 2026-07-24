export async function onRequest(context) {
  const { request, env, params } = context;
  const path = params.path || '';
  const url = new URL(request.url);

  const supabaseUrl = env.SUPABASE_URL || '';
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const targetUrl = `${supabaseUrl}/rest/v1/${path}${url.search}`;

  const headers = new Headers(request.headers);
  headers.set('Authorization', `Bearer ${serviceKey}`);

  const body = ['GET', 'HEAD'].includes(request.method) ? null : await request.text();

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
  });

  const responseHeaders = new Headers(response.headers);
  ['transfer-encoding', 'connection', 'keep-alive', 'content-encoding'].forEach(h => responseHeaders.delete(h));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}
