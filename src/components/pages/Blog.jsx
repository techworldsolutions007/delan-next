'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useParams, useSearchParams } from 'next/navigation';
// Blog.jsx
import React, { useState, useEffect } from 'react';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCircle, Loader2, AlertTriangle } from 'lucide-react';

import { shopify } from '@/lib/shopify.js';

const GET_BLOG_ARTICLES = `
  query GetBlogArticles($blogHandle: String!) {
    blog(handle: $blogHandle) {
      title
      articles(first: 10, sortKey: PUBLISHED_AT, reverse: true) {
        edges {
          node {
            id
            title
            handle
            excerptHtml
            publishedAt
            authorV2 { name }
            image {
              url(transform: { maxWidth: 800, maxHeight: 500, crop: CENTER })
              altText
            }
          }
        }
      }
    }
  }
`;

const Blog = ({ blogHandle: blogHandleProp, params: propParams } = {}) => {
  const routerParams = useParams();
  const params = propParams || routerParams || {};
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 1) direct prop, then route param, then :handle
  const routeHandle = blogHandleProp ?? params.blogHandle ?? params.handle ?? '';
  // 2) query ?handle=...
  const qsHandle = searchParams.get('handle') ?? '';
  // 3) env fallback
  const envHandle = process.env.NEXT_PUBLIC_SHOPIFY_DEFAULT_BLOG_HANDLE ?? '';

  // Final, trimmed handle
  const blogHandle = decodeURIComponent((routeHandle || qsHandle || envHandle).trim());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;

    if (!blogHandle) {
      setError('Missing blog handle in the route. Define /blogs/:blogHandle, pass ?handle=, or set VITE_SHOPIFY_DEFAULT_BLOG_HANDLE.');
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
        if (!cancelled) setError(e?.message || "Failed to load blog articles.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [blogHandle]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="montserrat-500 text-gray-600 mt-4">Loading articles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <p className="montserrat-500 text-red-600 mt-4 text-center">
          Error loading blog: {error}
        </p>
      </div>
    );
  }

  if (!data?.blog) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
        <p className="montserrat-500 text-gray-600">Blog not found.</p>
      </div>
    );
  }

  const articles = data.blog?.articles?.edges ?? [];

  return (
    <div className="min-h-screen flex flex-col items-center bg-white px-4 pt-16 md:pt-24 pb-16">
      <h1 className="cormorant-garamond-700 text-primary text-3xl md:text-4xl lg:text-5xl uppercase mb-12 text-center">
       BLOGS/{data.blog.title}
      </h1>

      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {articles.map(({ node: article }) => {
          const author = article.authorV2?.name || 'Unknown';
          const dateStr = new Date(article.publishedAt).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
          });

          return (
            <Link href={`/blogs/${encodeURIComponent(blogHandle)}/${article.handle}`}
              key={article.id}
              className="group"
            >
              <Card className="h-full flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 py-0! pb-6!">
                {article.image?.url && (
                  <div className="relative aspect-[16/9]">
                    <Image
                      src={article.image.url}
                      alt={article.image.altText || article.title}
                      fill
                      className="object-cover object-top"
                    />
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-center text-sm text-gray-500 montserrat-500">
                    <UserCircle className="h-5 w-5 mr-2" />
                    <span>{author}</span>
                    <span className="mx-2">·</span>
                    <span>{dateStr}</span>
                  </div>
                  <CardTitle className="cormorant-garamond-700 text-2xl mt-2 text-primary group-hover:text-primary transition-colors">
                    {article.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="flex-grow">
                  <div
                    className="prose prose-sm text-gray-600 montserrat-500"
                    dangerouslySetInnerHTML={{ __html: article.excerptHtml || '' }}
                  />
                </CardContent>

                <CardFooter>
                  <p className="font-semibold text-primary uppercase tracking-wider text-sm">
                    Read More »
                  </p>
                </CardFooter>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default Blog;
