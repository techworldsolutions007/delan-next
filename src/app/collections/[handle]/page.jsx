import { cache } from 'react';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import CollectionPage from '@/components/pages/Collection';
import { shopify } from '@/lib/shopify';
import { GET_COLLECTION_BY_HANDLE } from '@/lib/queries';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://delan.in';

const COLLECTION_META_QUERY = /* GraphQL */ `
  query CollectionMeta($handle: String!) {
    collection(handle: $handle) {
      title
      description
      seo { title description }
      image { url altText width height }
    }
  }
`;

const ALL_COLLECTION_HANDLES_QUERY = /* GraphQL */ `
  query AllCollectionHandles($first: Int!, $after: String) {
    collections(first: $first, after: $after) {
      edges { cursor node { handle } }
      pageInfo { hasNextPage }
    }
  }
`;

const getCollection = cache(async (handle) => {
  try {
    const data = await shopify(COLLECTION_META_QUERY, { handle });
    return data?.collection ?? null;
  } catch {
    return null;
  }
});

export const dynamicParams = true;

export async function generateStaticParams() {
  const params = [];
  let cursor = null;
  let hasNextPage = true;
  try {
    while (hasNextPage) {
      const data = await shopify(ALL_COLLECTION_HANDLES_QUERY, { first: 250, after: cursor });
      const edges = data?.collections?.edges ?? [];
      params.push(...edges.map((e) => ({ handle: e.node.handle })));
      hasNextPage = data?.collections?.pageInfo?.hasNextPage ?? false;
      cursor = edges[edges.length - 1]?.cursor ?? null;
    }
  } catch {
    // If the API fails at build time, pages are SSR'd on first request
  }
  return params;
}

export async function generateMetadata({ params }) {
  const { handle } = await params;
  const c = await getCollection(handle);
  if (!c) return {};

  const title = c.seo?.title || c.title;
  const description = (c.seo?.description || c.description || '').slice(0, 160);
  const image = c.image;
  const url = `${SITE_URL}/collections/${handle}`;

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
      images: image
        ? [{ url: image.url, alt: image.altText || title, width: image.width, height: image.height }]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image.url] : [],
    },
  };
}

export default async function Page({ params }) {
  const { handle } = await params;
  const c = await getCollection(handle);

  if (!c) notFound();

  // Fetch the first batch of products server-side so CollectionPage renders
  // with real data immediately — no client-side loading spinner on first visit.
  // Default sort matches the client's initial sort state ("date-desc" → CREATED desc).
  let initialData = null;
  try {
    initialData = await shopify(GET_COLLECTION_BY_HANDLE, {
      handle,
      first: 20,
      after: null,
      sortKey: 'CREATED',
      reverse: true,
    });
  } catch {
    // CollectionPage falls back to its own client-side fetch
  }

  const collectionUrl = `${SITE_URL}/collections/${handle}`;

  const jsonLdBlocks = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: c.title,
      description: c.description || '',
      url: collectionUrl,
      ...(c.image ? { image: c.image.url } : {}),
      publisher: {
        '@type': 'Organization',
        name: 'Delan',
        url: SITE_URL,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/logos/delan-logo.png` },
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: c.title, item: collectionUrl },
      ],
    },
  ];

  return (
    <>
      {jsonLdBlocks.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
      <Suspense fallback={null}>
        <CollectionPage handle={handle} initialData={initialData} />
      </Suspense>
    </>
  );
}
