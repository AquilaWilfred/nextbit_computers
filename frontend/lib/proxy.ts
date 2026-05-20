const CATALOGUE = process.env.CATALOGUE_URL ?? 'http://127.0.0.1:8001';

export async function proxyToCatalogue(request: Request, upstreamPath?: string): Promise<Response> {
  const url = new URL(request.url);
  const path = upstreamPath ?? url.pathname + url.search;
  const upstream = `${CATALOGUE}${path}`;
  console.log('[proxyToCatalogue] incoming', request.method, request.url, '->', upstream);

  const headers = new Headers(request.headers);
  headers.delete('host');

  const cookie = request.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);

  const auth = request.headers.get('authorization');
  if (auth) headers.set('authorization', auth);

  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer();

  const res = await fetch(upstream, { method: request.method, headers, body });
  console.log('[proxyToCatalogue] upstream response', res.status, upstream);

  // Copy response headers but rewrite set-cookie to come from :3000
  const resHeaders = new Headers();
  res.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      // Strip domain/secure constraints so cookie is set on localhost:3000
      const rewritten = value
        .replace(/; domain=[^;]*/i, '')
        .replace(/; secure/i, '');
      resHeaders.append('set-cookie', rewritten);
    } else {
      resHeaders.set(key, value);
    }
  });

  return new Response(res.body, {
    status: res.status,
    headers: resHeaders,
  });
}