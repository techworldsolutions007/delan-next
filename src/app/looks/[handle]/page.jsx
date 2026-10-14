import { cache } from 'react';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import LookPage from '@/components/pages/LookPage';
import { shopify } from '@/lib/shopify';
import { GET_LOOK_BY_HANDLE, normalizeLook_, cdnImage } from '@/lib/looks';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://delan.in';

const getLook = cache(async (handle) => {
  try {
    const data = await shopify(GET_LOOK_BY_HANDLE, { handle });
    return normalizeLook_(data?.metaobject) ?? null;
  } catch {
    return null;
  }
});

export const dynamicParams = true;

export async function generateMetadata({ params }) {
  const { handle } = await params;
  const look = await getLook(handle);
  if (!look) return {};

  const title = `${look.title} — Shop the Look | DELAN`;
  const description = `Shop the complete look from DELAN — ${look.products
    .slice(0, 3)
    .map((p) => p.title)
    .join(', ')}`;
  const imageUrl = cdnImage(look.image.url, 1200);
  const url = `${SITE_URL}/looks/${handle}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      type: 'website',
      url,
      images: imageUrl ? [{ url: imageUrl, alt: look.image.altText || look.title }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
  };
}

export default async function Page({ params }) {
  const { handle } = await params;
  const initialLook = await getLook(handle);

  if (!initialLook) notFound();

  return (
    <Suspense fallback={null}>
      <LookPage handle={handle} initialLook={initialLook} />
    </Suspense>
  );
}
