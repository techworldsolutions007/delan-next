import { cache } from 'react';
import { Suspense } from 'react';
import Blog from '@/components/pages/Blog';
import { shopify } from '@/lib/shopify';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://delan.in';

const BLOG_META_QUERY = /* GraphQL */ `
  query BlogMeta($handle: String!) {
    blog(handle: $handle) {
      title
      seo { title description }
    }
  }
`;

const getBlog = cache(async (handle) => {
  try {
    const data = await shopify(BLOG_META_QUERY, { handle });
    return data?.blog ?? null;
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }) {
  const { blogHandle } = await params;
  const b = await getBlog(blogHandle);
  if (!b) return {};

  const title = b.seo?.title || b.title;
  const description = b.seo?.description || `Read the latest ${b.title} articles from Delan.`;
  const url = `${SITE_URL}/blogs/${blogHandle}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, type: 'website', url },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function Page({ params }) {
  const { blogHandle } = await params;
  const b = await getBlog(blogHandle);

  const jsonLd = b
    ? {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: b.title,
        url: `${SITE_URL}/blogs/${blogHandle}`,
        publisher: {
          '@type': 'Organization',
          name: 'Delan',
          url: SITE_URL,
        },
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <Suspense fallback={null}>
        <Blog blogHandle={blogHandle} />
      </Suspense>
    </>
  );
}
