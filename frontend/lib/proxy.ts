const CATALOGUE =
  process.env.CATALOGUE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.AXUM_GATEWAY_URL ??
  'http://127.0.0.1:8001';

export async function proxyToCatalogue(request: Request, upstreamPath?: string): Promise<Response> {
  const url = new URL(request.url);
  const path = upstreamPath ?? url.pathname + url.search;
  const upstream = `${CATALOGUE}${path}`;
  console.log('[proxyToCatalogue] incoming', request.method, request.url, '->', upstream);

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('accept-encoding'); // ← prevent upstream from compressing

  const cookie = request.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);

  const auth = request.headers.get('authorization');
  if (auth) headers.set('authorization', auth);

  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer();

  let res: Response;
  try {
    res = await fetch(upstream, { method: request.method, headers, body });
  } catch (err: any) {
    console.error('[proxyToCatalogue] fetch error ->', upstream, err?.message ?? err);
    return new Response(JSON.stringify({ error: 'Upstream unavailable', details: String(err) }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }

  console.log('[proxyToCatalogue] upstream response', res.status, upstream);

  const resHeaders = new Headers();
  res.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === 'set-cookie') {
      const rewritten = value.replace(/; domain=[^;]*/i, '').replace(/; secure/i, '');
      resHeaders.append('set-cookie', rewritten);
    } else if (lower !== 'content-encoding' && lower !== 'transfer-encoding') {
      // ← drop encoding headers; body is already decoded by fetch()
      resHeaders.set(key, value);
    }
  });

  const buffer = await res.arrayBuffer();
  return new Response(buffer, {
    status: res.status,
    headers: resHeaders,
  });
}

const GATEWAY =
  process.env.AXUM_GATEWAY_URL ??
  process.env.NEXT_PUBLIC_GATEWAY_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.CATALOGUE_URL ??
  'http://127.0.0.1:8080';

export async function proxyToGateway(request: Request, upstreamPath?: string): Promise<Response> {
  const url = new URL(request.url);
  const path = upstreamPath ?? url.pathname + url.search;
  const upstream = `${GATEWAY}${path}`;
  console.log('[proxyToGateway] incoming', request.method, request.url, '->', upstream);

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('accept-encoding'); // ← prevent upstream from compressing

  const cookie = request.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);

  const auth = request.headers.get('authorization');
  if (auth) headers.set('authorization', auth);

  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer();

  let res: Response;
  try {
    res = await fetch(upstream, { method: request.method, headers, body });
  } catch (err: any) {
    console.error('[proxyToGateway] fetch error ->', upstream, err?.message ?? err);
    return new Response(JSON.stringify({ error: 'Upstream unavailable', details: String(err) }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }

  console.log('[proxyToGateway] upstream response', res.status, upstream);

  const resHeaders = new Headers();
  res.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === 'set-cookie') {
      const rewritten = value.replace(/; domain=[^;]*/i, '').replace(/; secure/i, '');
      resHeaders.append('set-cookie', rewritten);
    } else if (lower !== 'content-encoding' && lower !== 'transfer-encoding') {
      // ← drop encoding headers; body is already decoded by fetch()
      resHeaders.set(key, value);
    }
  });

  const buffer = await res.arrayBuffer();
  return new Response(buffer, {
    status: res.status,
    headers: resHeaders,
  });
}