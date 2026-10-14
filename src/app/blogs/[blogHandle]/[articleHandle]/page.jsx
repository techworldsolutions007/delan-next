import { cache } from 'react';
import { Suspense } from 'react';
import Blogpost from '@/components/pages/Blogpost';
import { shopify } from '@/lib/shopify';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://delan.in';

const ARTICLE_META_QUERY = /* GraphQL */ `
  query ArticleMeta($blogHandle: String!, $articleHandle: String!) {
    blog(handle: $blogHandle) {
      title
      articleByHandle(handle: $articleHandle) {
        title
        excerpt
        publishedAt
        image { url altText width height }
        author { name }
        seo { title description }
      }
    }
  }
`;

const getArticle = cache(async (blogHandle, articleHandle) => {
  try {
    const data = await shopify(ARTICLE_META_QUERY, { blogHandle, articleHandle });
    return data?.blog ?? null;
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }) {
  const { blogHandle, articleHandle } = await params;
  const blog = await getArticle(blogHandle, articleHandle);
  const a = blog?.articleByHandle;
  if (!a) return {};

  const title = a.seo?.title || a.title;
  const description = (a.seo?.description || a.excerpt || '').slice(0, 160);
  const image = a.image;
  const url = `${SITE_URL}/blogs/${blogHandle}/${articleHandle}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    authors: a.author?.name ? [{ name: a.author.name }] : undefined,
    openGraph: {
      title,
      description,
      type: 'article',
      url,
      publishedTime: a.publishedAt,
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
  const { blogHandle, articleHandle } = await params;
  const blog = await getArticle(blogHandle, articleHandle);
  const a = blog?.articleByHandle;

  const articleUrl = `${SITE_URL}/blogs/${blogHandle}/${articleHandle}`;

  const jsonLd = a
    ? {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: a.title,
        description: a.excerpt || '',
        datePublished: a.publishedAt,
        url: articleUrl,
        mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
        ...(a.image ? { image: a.image.url } : {}),
        author: { '@type': 'Person', name: a.author?.name || 'Delan' },
        publisher: {
          '@type': 'Organization',
          name: 'Delan',
          url: SITE_URL,
          logo: { '@type': 'ImageObject', url: `${SITE_URL}/logos/delan-logo.png` },
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
        <Blogpost blogHandle={blogHandle} articleHandle={articleHandle} />
      </Suspense>
    </>
  );
}
