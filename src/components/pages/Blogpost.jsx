'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
// Blogpost.jsx
import React, { useEffect, useState } from 'react';

// shadcn/ui
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

// icons
import { Loader2, ArrowLeft, CalendarDays, User2 } from "lucide-react";

// ✅ your shared Shopify helper
import { shopify } from '@/lib/shopify.js';

// GraphQL
const GET_SINGLE_ARTICLE = `
  query GetSingleArticle($blogHandle: String!, $articleHandle: String!) {
    blog(handle: $blogHandle) {
      articleByHandle(handle: $articleHandle) {
        title
        contentHtml
        publishedAt
        authorV2 { name }
        image {
          url(transform: { maxWidth: 1600 })
          altText
        }
      }
    }
  }
`;

export default function Blogpost({ blogHandle: blogHandleProp, articleHandle: articleHandleProp, params: propParams } = {}) {
  const routerParams = useParams();
  const params = propParams || routerParams || {};
  const blogHandle = blogHandleProp ?? decodeURIComponent(String(params.blogHandle ?? '')).trim();
  const articleHandle = articleHandleProp ?? decodeURIComponent(String(params.articleHandle ?? '')).trim();

  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [article, setArticle]   = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        if (!blogHandle || !articleHandle) {
          throw new Error('Missing blog or article handle in the route.');
        }

        const data = await shopify(GET_SINGLE_ARTICLE, { blogHandle, articleHandle });
        const a = data?.blog?.articleByHandle || null;

        if (!cancelled) setArticle(a);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError(e?.message || 'Failed to load article.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [blogHandle, articleHandle]);

  // Loading
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading article…</span>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Alert variant="destructive">
          <AlertTitle>Failed to load article</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-6">
          <Button asChild variant="secondary">
            <Link href={`/blogs/${encodeURIComponent(blogHandle)}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Blog
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Alert>
          <AlertTitle>Article not found</AlertTitle>
          <AlertDescription>
            We couldn’t find that post. It may have been moved or unpublished.
          </AlertDescription>
        </Alert>
        <div className="mt-6">
          <Button asChild variant="secondary">
            <Link href={`/blogs/${encodeURIComponent(blogHandle)}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Blog
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const author = article.authorV2?.name || 'Unknown';
  const dateStr = new Date(article.publishedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="px-4 py-10">
      <div className="max-w-4xl mx-auto">
        {/* Back link */}
        <div className="mb-6">
          <Button asChild variant="ghost" className="px-0 hover:bg-transparent">
            <Link href={`/blogs/${encodeURIComponent(blogHandle)}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Blog
            </Link>
          </Button>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl md:text-4xl leading-tight tracking-tight">
              {article.title}
            </CardTitle>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="inline-flex items-center gap-2">
                <User2 className="h-4 w-4" />
                <span>{author}</span>
              </div>
              <span className="hidden sm:inline">•</span>
              <div className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                <span>{dateStr}</span>
              </div>
            </div>
          </CardHeader>

          {article.image?.url && (
            <div className="px-6">
              <div className="mt-4 overflow-hidden rounded-xl border bg-muted/20">
                <div className="relative aspect-[16/9]">
                  <Image
                    src={article.image.url}
                    alt={article.image.altText || article.title}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          )}

          <CardContent className="pt-6">
            <Separator className="mb-6" />
            {/* Shopify provides HTML */}
            <article
              className="shopify-article-content max-w-none"
              dangerouslySetInnerHTML={{ __html: article.contentHtml || '' }}
            />
          </CardContent>
        </Card>

        <div className="mt-8 flex">
          <Button asChild variant="secondary">
            <Link href={`/blogs/${encodeURIComponent(blogHandle)}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Blog
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
