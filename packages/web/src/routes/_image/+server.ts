import type { RequestHandler } from './$types';
import { RESIZER_URL } from '$env/static/private';

const stage = process.env.SST_STAGE ?? 'staging';
const isProd = stage === 'prod' || stage === 'production';
const edgeTtl = isProd ? 3600 : 300;
const cacheHeader = `public, s-maxage=${edgeTtl}, stale-while-revalidate=60`;

export const GET: RequestHandler = async ({ url }) => {
  const source = url.searchParams.get('url');
  if (!source) {
    return new Response('Missing url', {
      status: 400,
      headers: { 'Cache-Control': 'no-store' }
    });
  }
  if (!RESIZER_URL) {
    return new Response('Image resizer unavailable', {
      status: 503,
      headers: { 'Cache-Control': 'no-store' }
    });
  }

  const widthParam = url.searchParams.get('w');

  const upstream = new URL(RESIZER_URL);
  upstream.searchParams.set('url', source);
  if (widthParam) upstream.searchParams.set('w', widthParam);

  const response = await fetch(upstream.toString());

  if (!response.ok) {
    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: {
        'Cache-Control': cacheHeader,
        'Content-Type': response.headers.get('content-type') ?? 'text/plain; charset=utf-8'
      }
    });
  }

  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') ?? 'image/jpeg';

  return new Response(buffer, {
    status: 200,
    headers: {
      'Cache-Control': cacheHeader,
      'Content-Type': contentType,
      'Content-Length': String(buffer.byteLength),
      'Vary': 'Accept'
    }
  });
};
