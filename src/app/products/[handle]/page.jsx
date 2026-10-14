import { cache } from 'react';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import Product from '@/components/pages/Product';
import { shopify } from '@/lib/shopify';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://delan.in';

const PRODUCT_META_QUERY = /* GraphQL */ `
  query ProductMeta($handle: String!) {
    product(handle: $handle) {
      title
      description
      productType
      vendor
      tags
      availableForSale
      seo { title description }
      images(first: 10) {
        edges { node { url(transform: {maxWidth: 800}) altText width height } }
      }
      priceRange {
        minVariantPrice { amount currencyCode }
        maxVariantPrice { amount currencyCode }
      }
      variants(first: 100) {
        edges {
          node {
            sku
            barcode
            availableForSale
            price { amount currencyCode }
            compareAtPrice { amount currencyCode }
            selectedOptions { name value }
          }
        }
      }
      rating: metafield(namespace: "reviews", key: "rating") { value }
      ratingCount: metafield(namespace: "reviews", key: "rating_count") { value }
    }
  }
`;

const ALL_PRODUCT_HANDLES_QUERY = /* GraphQL */ `
  query AllProductHandles($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges { cursor node { handle } }
      pageInfo { hasNextPage }
    }
  }
`;

const getProduct = cache(async (handle) => {
  try {
    const data = await shopify(PRODUCT_META_QUERY, { handle });
    return data?.product ?? null;
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
      const data = await shopify(ALL_PRODUCT_HANDLES_QUERY, { first: 250, after: cursor });
      const edges = data?.products?.edges ?? [];
      params.push(...edges.map((e) => ({ handle: e.node.handle })));
      hasNextPage = data?.products?.pageInfo?.hasNextPage ?? false;
      cursor = edges[edges.length - 1]?.cursor ?? null;
    }
  } catch {
    // If the API fails at build time, pages are SSR'd on first request
  }
  return params;
}

export async function generateMetadata({ params }) {
  const { handle } = await params;
  const p = await getProduct(handle);
  if (!p) return {};

  const title = p.seo?.title || p.title;
  const description = (p.seo?.description || p.description || '').slice(0, 160);
  const image = p.images?.edges?.[0]?.node;
  const url = `${SITE_URL}/products/${handle}`;

  return {
    title,
    description,
    keywords: p.tags?.length ? p.tags.join(', ') : undefined,
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
  const p = await getProduct(handle);

  if (!p) notFound();

  const jsonLdBlocks = [];
  const productUrl = `${SITE_URL}/products/${handle}`;
  const images = p.images?.edges?.map((e) => e.node.url) ?? [];
  const variants = p.variants?.edges?.map((e) => e.node) ?? [];
  const currency = p.priceRange?.minVariantPrice?.currencyCode ?? 'INR';
  const minPrice = p.priceRange?.minVariantPrice?.amount ?? '0';
  const maxPrice = p.priceRange?.maxVariantPrice?.amount ?? minPrice;
  const globalAvailability = p.availableForSale
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';

  // Aggregate rating from Shopify reviews metafield
  let aggregateRating;
  if (p.rating?.value) {
    try {
      const parsed = JSON.parse(p.rating.value);
      const ratingNum = Number(parsed?.value ?? parsed);
      const count = p.ratingCount?.value ? Number(p.ratingCount.value) : undefined;
      if (ratingNum > 0) {
        aggregateRating = {
          '@type': 'AggregateRating',
          ratingValue: ratingNum.toFixed(1),
          bestRating: '5',
          worstRating: '1',
          ...(count && count > 0 ? { reviewCount: count } : {}),
        };
      }
    } catch {}
  }

  // Build per-variant Offer
  const buildOffer = (v) => ({
    '@type': 'Offer',
    url: productUrl,
    priceCurrency: currency,
    price: v?.price?.amount ?? minPrice,
    availability: v?.availableForSale
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock',
    itemCondition: 'https://schema.org/NewCondition',
    seller: { '@type': 'Organization', name: 'Delan' },
    ...(v?.sku ? { sku: v.sku } : {}),
    ...(v?.barcode ? { gtin: v.barcode } : {}),
    ...(v?.compareAtPrice?.amount
      ? {
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: v.compareAtPrice.amount,
            priceCurrency: currency,
          },
        }
      : {}),
  });

  const allSamePrice =
    variants.length <= 1 ||
    variants.every((v) => v.price?.amount === variants[0]?.price?.amount);

  const offers =
    allSamePrice
      ? buildOffer(variants[0] ?? { price: { amount: minPrice }, availableForSale: p.availableForSale })
      : {
          '@type': 'AggregateOffer',
          lowPrice: minPrice,
          highPrice: maxPrice,
          priceCurrency: currency,
          offerCount: variants.length,
          availability: globalAvailability,
          offers: variants.map(buildOffer),
        };

  jsonLdBlocks.push({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.title,
    description: p.description || '',
    url: productUrl,
    image: images,
    brand: { '@type': 'Brand', name: p.vendor || 'Delan' },
    ...(p.productType ? { category: p.productType } : {}),
    ...(p.tags?.length ? { keywords: p.tags.join(', ') } : {}),
    offers,
    ...(aggregateRating ? { aggregateRating } : {}),
  });

  jsonLdBlocks.push({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'All Products', item: `${SITE_URL}/collections/all` },
      { '@type': 'ListItem', position: 3, name: p.title, item: productUrl },
    ],
  });

  const firstImageUrl = p.images?.edges?.[0]?.node?.url;

  return (
    <>
      {/* Preload LCP product image — browser starts fetch from HTML, before client JS runs */}
      {firstImageUrl && (
        <link
          rel="preload"
          as="image"
          href={firstImageUrl}
          fetchPriority="high"
        />
      )}
      {jsonLdBlocks.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
      <Suspense fallback={null}>
        <Product handle={handle} />
      </Suspense>
    </>
  );
}
