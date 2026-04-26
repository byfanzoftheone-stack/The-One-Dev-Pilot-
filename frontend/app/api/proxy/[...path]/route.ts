import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path, 'GET');
}
export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path, 'POST');
}
export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path, 'PATCH');
}
export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path, 'DELETE');
}

async function proxyRequest(req: NextRequest, pathParts: string[], method: string) {
  const path = pathParts.join('/');
  const url = new URL(req.url);
  const targetUrl = `${API_URL}/api/${path}${url.search}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    cookie: req.headers.get('cookie') || '',
  };

  let body: string | undefined;
  if (method !== 'GET' && method !== 'DELETE') {
    try { body = await req.text(); } catch {}
  }

  try {
    const res = await fetch(targetUrl, { method, headers, body, credentials: 'include' });
    const data = await res.text();
    const resHeaders: HeadersInit = { 'Content-Type': 'application/json' };
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) resHeaders['Set-Cookie'] = setCookie;
    return new NextResponse(data, { status: res.status, headers: resHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
