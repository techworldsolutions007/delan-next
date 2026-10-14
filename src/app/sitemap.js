import { shopify } from '@/lib/shopify';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://delan.in';


/* ── Paginated fetchers ────────────────────────────────────────────── */

const PRODUCTS_QUERY = /* GraphQL */ `
  query SitemapProducts($first: Int!, $after: String) {
    products(first: $first, after: $after, sortKey: UPDATED_AT, reverse: true) {
      edges {
        cursor
        node { handle updatedAt }
      }
      pageInfo { hasNextPage }
    }
  }
`;

const COLLECTIONS_QUERY = /* GraphQL */ `
  query SitemapCollections($first: Int!, $after: String) {
    collections(first: $first, after: $after) {
      edges {
        cursor
        node { handle updatedAt }
      }
      pageInfo { hasNextPage }
    }
  }
`;

const BLOGS_QUERY = /* GraphQL */ `
  query SitemapBlogs {
    blogs(first: 10) {
      edges {
        node {
          handle
          articles(first: 250) {
            edges {
              node { handle publishedAt }
            }
          }
        }
      }
    }
  }
`;

async function fetchAllPages(query, rootKey) {
  const results = [];
  let cursor = null;
  let hasNextPage = true;
  try {
    while (hasNextPage) {
      const data = await shopify(query, { first: 250, after: cursor });
      const edges = data?.[rootKey]?.edges ?? [];
      results.push(...edges.map((e) => e.node));
      hasNextPage = data?.[rootKey]?.pageInfo?.hasNextPage ?? false;
      cursor = edges[edges.length - 1]?.cursor ?? null;
    }
  } catch (err) {
    console.error(`[sitemap] Failed to fetch ${rootKey}:`, err?.message);
  }
  return results;
}

/* ── Static pages ─────────────────────────────────────────────────── */
const STATIC_PAGES = [
  { path: '/',                    priority: 1.0, changeFrequency: 'daily' },
  { path: '/collections/all',     priority: 0.9, changeFrequency: 'daily' },
  { path: '/about-us',            priority: 0.7, changeFrequency: 'monthly' },
  { path: '/why-delan',           priority: 0.7, changeFrequency: 'monthly' },
  { path: '/contact',             priority: 0.7, changeFrequency: 'monthly' },
  { path: '/affiliate-program',   priority: 0.6, changeFrequency: 'monthly' },
  { path: '/fabric-care',         priority: 0.6, changeFrequency: 'monthly' },
  { path: '/faq',                 priority: 0.6, changeFrequency: 'monthly' },
  { path: '/track-order',         priority: 0.5, changeFrequency: 'monthly' },
  { path: '/returns-exchange',    priority: 0.4, changeFrequency: 'monthly' },
  { path: '/shipping-policy',     priority: 0.4, changeFrequency: 'monthly' },
  { path: '/privacy-policy',      priority: 0.3, changeFrequency: 'yearly' },
  { path: '/terms-conditions',    priority: 0.3, changeFrequency: 'yearly' },
];

/* ── Main export ──────────────────────────────────────────────────── */
export default async function sitemap() {
  const [products, collections, blogsData] = await Promise.all([
    fetchAllPages(PRODUCTS_QUERY, 'products'),
    fetchAllPages(COLLECTIONS_QUERY, 'collections'),
    shopify(BLOGS_QUERY, {}).catch(() => null),
  ]);

  const now = new Date();

  const staticEntries = STATIC_PAGES.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    priority,
    changeFrequency,
  }));

  const collectionEntries = collections.map(({ handle, updatedAt }) => ({
    url: `${SITE_URL}/collections/${handle}`,
    lastModified: updatedAt ? new Date(updatedAt) : now,
    changeFrequency: 'weekly',
    priority: 0.85,
  }));

  const productEntries = products.map(({ handle, updatedAt }) => ({
    url: `${SITE_URL}/products/${handle}`,
    lastModified: updatedAt ? new Date(updatedAt) : now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const articleEntries = [];
  const blogs = blogsData?.blogs?.edges ?? [];
  for (const { node: blog } of blogs) {
    for (const { node: article } of blog.articles?.edges ?? []) {
      articleEntries.push({
        url: `${SITE_URL}/blogs/${blog.handle}/${article.handle}`,
        lastModified: article.publishedAt ? new Date(article.publishedAt) : now,
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }
    // Blog index page
    articleEntries.push({
      url: `${SITE_URL}/blogs/${blog.handle}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.65,
    });
  }

  return [...staticEntries, ...collectionEntries, ...productEntries, ...articleEntries];
}
