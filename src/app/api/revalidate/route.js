import { revalidateTag, revalidatePath } from 'next/cache';
import crypto from 'crypto';

export const runtime = 'nodejs';

const SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;

function verifyHmac(rawBody, hmacHeader) {
  if (!SECRET) {
    // In production SHOPIFY_WEBHOOK_SECRET must be set — reject all requests if missing
    if (process.env.NODE_ENV === 'production') {
      console.error('[revalidate] SHOPIFY_WEBHOOK_SECRET is not set — rejecting request. Set it in Vercel env vars.');
      return false;
    }
    // Dev only: skip HMAC so you can test without a real Shopify secret
    console.warn('[revalidate] SHOPIFY_WEBHOOK_SECRET not set — skipping HMAC check (dev only)');
    return true;
  }
  const digest = crypto.createHmac('sha256', SECRET).update(rawBody, 'utf8').digest('base64');
  const a = Buffer.from(digest);
  const b = Buffer.from(hmacHeader || '');
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req) {
  const rawBody = await req.text();
  const hmacHeader = req.headers.get('x-shopify-hmac-sha256') || '';
  const topic = req.headers.get('x-shopify-topic') || '';

  if (!verifyHmac(rawBody, hmacHeader)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // products/create  products/update  products/delete
  if (topic.startsWith('products/')) {
    const handle = payload.handle;
    revalidateTag('products');
    revalidateTag('looks'); // looks embed product data (price, availability)
    if (handle) {
      revalidateTag(`product-${handle}`);
      revalidatePath(`/products/${handle}`);
    }
  }

  // collections/create  collections/update  collections/delete
  if (topic.startsWith('collections/')) {
    const handle = payload.handle;
    revalidateTag('collections');
    if (handle) {
      revalidateTag(`collection-${handle}`);
      revalidatePath(`/collections/${handle}`);
    }
  }

  // inventory_levels/update — revalidate all products (availability may have changed)
  if (topic === 'inventory_levels/update') {
    revalidateTag('products');
    revalidateTag('looks');
  }

  // blog articles
  if (topic.startsWith('articles/')) {
    revalidateTag('blogs');
  }

  // Revalidate sitemap whenever catalog changes
  if (
    topic.startsWith('products/') ||
    topic.startsWith('collections/') ||
    topic.startsWith('articles/')
  ) {
    revalidatePath('/sitemap.xml');
  }

  console.log(`[revalidate] topic=${topic} handle=${payload.handle ?? '—'}`);
  return Response.json({ ok: true, topic, ts: Date.now() });
}
