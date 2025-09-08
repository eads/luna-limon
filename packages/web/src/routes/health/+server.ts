import { json } from '@sveltejs/kit';

export async function GET({ setHeaders }) {
  const stage = process.env.SST_STAGE ?? 'staging';
  const ttl = stage === 'production' ? 3600 : 300;
  const cacheControl = `public, s-maxage=${ttl}, stale-while-revalidate=60`;

  // Mirror page caching policy for easy verification via headers
  setHeaders({ 'Cache-Control': cacheControl });

  return json({
    ok: true,
    stage,
    ttl,
    cacheControl,
    now: new Date().toISOString()
  });
}
