'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, AlertTriangle, ArrowRight } from 'lucide-react';
import { shopify } from '@/lib/shopify.js';

const GET_BLOG_ARTICLES = `
  query GetBlogArticles($blogHandle: String!) {
    blog(handle: $blogHandle) {
      title
      articles(first: 20, sortKey: PUBLISHED_AT, reverse: true) {
        edges {
          node {
            id
            title
            handle
            excerptHtml
            publishedAt
            tags
            authorV2 { name }
            image {
              url(transform: { maxWidth: 1200, maxHeight: 900, crop: CENTER })
              altText
            }
          }
        }
      }
    }
  }
`;

// Editorial categories mapped to Shopify article tags
// Only shown if at least one article carries a matching tag
const CATEGORY_DEFS = [
  { id: 'all',          label: 'All Stories',    tags: null },
  { id: 'style-notes',  label: 'Style Notes',    tags: ['style-notes', 'style notes', 'style'] },
  { id: 'fabric-craft', label: 'Fabric & Craft', tags: ['fabric-craft', 'fabric & craft', 'fabric', 'craft'] },
  { id: 'behind-delan', label: 'Behind Delan',   tags: ['behind-delan', 'behind delan', 'behind the brand'] },
];

function articleMatchesCategory(article, categoryId) {
  if (categoryId === 'all') return true;
  const def = CATEGORY_DEFS.find(c => c.id === categoryId);
  if (!def?.tags) return false;
  const artTags = (article.tags || []).map(t => t.toLowerCase().trim());
  return def.tags.some(tag => artTags.includes(tag.toLowerCase().trim()));
}

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&(?:#?\w+);/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

// Returns the best display category label for an article
function getDisplayCategory(article) {
  if (!article.tags?.length) return '';
  for (const def of CATEGORY_DEFS.slice(1)) {
    if (articleMatchesCategory(article, def.id)) return def.label;
  }
  // Fall back to the first raw tag, humanised
  return article.tags[0]
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/* ─── Featured article — editorial split (60 / 40) ─── */
function FeaturedArticle({ article, blogHandle }) {
  const excerpt = stripHtml(article.excerptHtml);
  const category = getDisplayCategory(article);

  return (
    <Link
      href={`/blogs/${encodeURIComponent(blogHandle)}/${article.handle}`}
      className="group block"
    >
      <div className="flex flex-col lg:flex-row border border-[#e8e0dc] lg:h-[520px]">

        {/* Image — 60 % on desktop */}
        <div className="relative w-full lg:w-[60%] overflow-hidden bg-neutral-100 aspect-[4/3] lg:aspect-auto">
          {article.image?.url ? (
            <Image
              src={article.image.url}
              alt={article.image.altText || article.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="absolute inset-0 bg-neutral-100" />
          )}
        </div>

        {/* Content — 40 % on desktop */}
        <div className="w-full lg:w-[40%] flex flex-col justify-center px-6 py-8 lg:px-10 lg:py-14 bg-white border-t border-[#e8e0dc] lg:border-t-0 lg:border-l">
          {category && (
            <p className="montserrat-600 text-[10px] uppercase tracking-[0.18em] text-[#642c44] mb-4">
              {category}
            </p>
          )}

          <h2 className="cormorant-garamond-600 text-primary text-[26px] sm:text-[30px] lg:text-[34px] leading-[1.2] mb-4">
            {article.title}
          </h2>

          {excerpt && (
            <p className="montserrat-400 text-[13px] text-neutral-600 leading-relaxed mb-5 line-clamp-3">
              {excerpt}
            </p>
          )}

          <p className="montserrat-400 text-[11px] text-neutral-400 tracking-[0.04em] mb-8">
            {formatDate(article.publishedAt)}
          </p>

          <span className="inline-flex items-center gap-2 montserrat-600 text-[11px] uppercase tracking-[0.16em] text-primary border-b border-primary pb-px w-fit transition-opacity group-hover:opacity-60">
            Read Story <ArrowRight className="w-[11px] h-[11px]" />
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ─── Article card for the grid ─── */
function ArticleCard({ article, blogHandle, eager }) {
  const excerpt = stripHtml(article.excerptHtml);
  const category = getDisplayCategory(article);

  return (
    <Link
      href={`/blogs/${encodeURIComponent(blogHandle)}/${article.handle}`}
      className="group flex flex-col"
    >
      {/* Image 4:3 */}
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
        {article.image?.url ? (
          <Image
            src={article.image.url}
            alt={article.image.altText || article.title}
            fill
            loading={eager ? 'eager' : 'lazy'}
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 bg-neutral-100" />
        )}
      </div>

      {/* Text content */}
      <div className="flex flex-col flex-1 pt-4">
        {/* Meta row */}
        <div className="flex items-center gap-2 mb-2.5">
          {category && (
            <span className="montserrat-600 text-[10px] uppercase tracking-[0.15em] text-[#642c44]">
              {category}
            </span>
          )}
          {category && <span className="text-neutral-300 text-xs select-none">·</span>}
          <span className="montserrat-400 text-[11px] text-neutral-400 tracking-[0.02em]">
            {formatDate(article.publishedAt)}
          </span>
        </div>

        {/* Title */}
        <h2 className="cormorant-garamond-600 text-primary text-[20px] leading-[1.25] mb-2.5 line-clamp-3">
          {article.title}
        </h2>

        {/* Excerpt */}
        {excerpt && (
          <p className="montserrat-400 text-[12px] text-neutral-600 leading-relaxed line-clamp-2 mb-4">
            {excerpt}
          </p>
        )}

        {/* Read link */}
        <div className="mt-auto pt-1 pb-6">
          <span className="inline-flex items-center gap-1.5 montserrat-600 text-[10px] uppercase tracking-[0.14em] text-primary transition-opacity group-hover:opacity-60">
            Read Story <ArrowRight className="w-[10px] h-[10px]" />
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ─── Main component ─── */
const Blog = ({ blogHandle: blogHandleProp, params: propParams } = {}) => {
  const routerParams = useParams();
  const params = propParams || routerParams || {};
  const routeHandle = blogHandleProp ?? params.blogHandle ?? params.handle ?? '';
  const envHandle = process.env.NEXT_PUBLIC_SHOPIFY_DEFAULT_BLOG_HANDLE ?? '';
  const blogHandle = decodeURIComponent((routeHandle || envHandle).trim());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    let cancelled = false;
    if (!blogHandle) {
      setError('Missing blog handle in the route. Define /blogs/:blogHandle, pass ?handle=, or set NEXT_PUBLIC_SHOPIFY_DEFAULT_BLOG_HANDLE.');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const d = await shopify(GET_BLOG_ARTICLES, { blogHandle });
        if (!cancelled) setData(d);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError(e?.message || 'Failed to load blog articles.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [blogHandle]);

  const articles = useMemo(
    () => data?.blog?.articles?.edges?.map(e => e.node) ?? [],
    [data],
  );

  // Only show category tabs that have at least one matching article
  const availableCategories = useMemo(() => {
    return CATEGORY_DEFS.filter(cat => {
      if (cat.id === 'all') return true;
      return articles.some(a => articleMatchesCategory(a, cat.id));
    });
  }, [articles]);

  // Featured = newest article; only rendered when showing All Stories
  const featuredArticle = articles[0] ?? null;

  // Grid articles: exclude featured when showing All, filter by category otherwise
  const gridArticles = useMemo(() => {
    if (activeCategory !== 'all') {
      return articles.filter(a => articleMatchesCategory(a, activeCategory));
    }
    return articles.slice(1);
  }, [articles, activeCategory]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="h-9 w-9 animate-spin text-primary/40" />
        <p className="montserrat-400 text-neutral-400 mt-4 text-[11px] tracking-[0.08em] uppercase">
          Loading stories…
        </p>
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
        <AlertTriangle className="h-9 w-9 text-red-400" />
        <p className="montserrat-400 text-neutral-600 mt-4 text-center text-[13px]">{error}</p>
      </div>
    );
  }

  /* ── Not found ── */
  if (!data?.blog) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="montserrat-400 text-neutral-400 text-[13px]">Journal not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">

      {/* ── Page header ── */}
      <div className="px-4 sm:px-6 lg:px-10 pt-14 pb-6 md:pt-20 md:pb-8 text-center border-b border-[#e8e0dc]">
        <h1 className="cormorant-garamond-600 text-primary text-[32px] sm:text-[40px] md:text-[46px] leading-[1.1]">
          The DELAN Journal
        </h1>
        <p className="mt-3 montserrat-400 text-neutral-500 text-[13px] md:text-[14px] leading-relaxed max-w-md mx-auto">
          An exploration of personal style, thoughtful design and the art of dressing.
        </p>
      </div>

      {/* ── Category navigation ── */}
      {availableCategories.length > 1 && (
        <div className="border-b border-[#e8e0dc]">
          <div className="px-4 sm:px-6 lg:px-10 max-w-7xl mx-auto flex overflow-x-auto no-scrollbar">
            {availableCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="relative flex-shrink-0 px-4 sm:px-5 py-3.5 montserrat-600 text-[11px] uppercase tracking-[0.16em] transition-colors whitespace-nowrap focus-visible:outline-none"
                style={{ color: activeCategory === cat.id ? '#642c44' : '#8a8a8a' }}
              >
                {cat.label}
                {activeCategory === cat.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#642c44]" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Featured article ── */}
      {activeCategory === 'all' && featuredArticle && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 mt-10 md:mt-12">
          <FeaturedArticle article={featuredArticle} blogHandle={blogHandle} />
        </div>
      )}

      {/* ── Articles grid ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 mt-10 md:mt-12 pb-16 md:pb-20">
        {gridArticles.length === 0 ? (
          <div className="text-center py-16">
            <p className="montserrat-400 text-neutral-400 text-[13px] tracking-[0.04em]">
              No stories in this category yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-0 md:gap-x-8">
            {gridArticles.map((article, i) => (
              <ArticleCard
                key={article.id}
                article={article}
                blogHandle={blogHandle}
                eager={i < 3}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Discover DELAN ── */}
      <div className="border-t border-[#e8e0dc] bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14 md:py-16 text-center">
          <h2 className="cormorant-garamond-700 text-primary text-[28px] md:text-[32px] leading-[1.15] tracking-[0.02em] mb-3">
            Discover the World of DELAN
          </h2>
          <p className="montserrat-500 text-primary/70 text-[13px] md:text-[14px] leading-snug tracking-[0.025em] mb-7 max-w-lg mx-auto">
            Every piece we create begins with intention — explore our collections, the people behind them, and the values that shape everything we make.
          </p>
          <Link
            href="/about-us"
            className="inline-flex items-center gap-2 montserrat-600 text-[11px] uppercase tracking-[0.16em] text-primary border-b border-primary pb-px transition-opacity hover:opacity-60"
          >
            Our Story <ArrowRight className="w-[11px] h-[11px]" />
          </Link>
        </div>
      </div>

    </div>
  );
};

export default Blog;
