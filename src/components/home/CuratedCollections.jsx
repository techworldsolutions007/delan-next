'use client';
import Link from 'next/link';
import Image from 'next/image';
// src/components/CuratedCollections.jsx
import React, { useEffect, useMemo, useState } from "react";
import { shopify } from "@/lib/shopify";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { GET_CURATED_THREE } from "@/lib/queries";

/**
 * Pass custom labels/handles with the `items` prop (length 3).
 * Make sure `handle` is the EXACT Shopify collection handle (slug).
 */
const DEFAULT_ITEMS = [
  { label: "SUMMER & RESORT", handle: "summer-resort" },
  { label: "WINTER & FESTIVE", handle: "winter-festive" },
  { label: "MONSOON & TRANSITIONAL", handle: "monsoon-transitional" },
];

// (Optional) Normalizer if your incoming handle strings have spaces/&.
// Prefer passing the exact handle from admin instead.
const normalizeHandle = (h) =>
  String(h || "")
    .trim()
    .toLowerCase()
    .replace(/\s*&\s*/g, "-and-")
    .replace(/\s+/g, "-");

// -------- Responsive image helpers (WebP + width variants) --------

// Only append Shopify-style params when it's a Shopify CDN URL.
// For local/other URLs, just return the original.
function buildSrc(url, width) {
  if (!url) return "";

  const isShopifyCdn = url.includes("cdn.shopify.com");
  if (!isShopifyCdn) {
    return url;
  }

  const hasQuery = url.includes("?");
  const sep = hasQuery ? "&" : "?";
  return `${url}${sep}width=${width}&format=webp&quality=80`;
}

function buildSrcSet(url) {
  if (!url) return "";

  // Fine-grained widths so the browser can choose the best size
  const widths = [320, 480, 640, 800, 1024, 1280];

  const isShopifyCdn = url.includes("cdn.shopify.com");
  if (!isShopifyCdn) {
    // For non-Shopify URLs, you can’t param-resize, so just return a basic srcSet
    return widths.map((w) => `${url} ${w}w`).join(", ");
  }

  return widths.map((w) => `${buildSrc(url, w)} ${w}w`).join(", ");
}

// -------- Primary image selection --------
function getPrimaryImage(col) {
  // Try collection image first
  const ci = col?.image;
  const cUrl = ci?.url || ci?.src;
  if (cUrl) {
    return { url: cUrl, alt: ci?.altText || col?.title || "" };
  }

  // Fallback: first product's first image
  const pimg = col?.products?.edges?.[0]?.node?.images?.edges?.[0]?.node;
  const pUrl = pimg?.url || pimg?.src;
  if (pUrl) {
    return { url: pUrl, alt: pimg?.altText || col?.title || "" };
  }

  // Last resort: local placeholder (no resizing params)
  return { url: "/images/placeholder-4x5.png", alt: col?.title || "Collection" };
}

export default function CuratedCollections({ items = DEFAULT_ITEMS }) {
  const [i1, i2, i3] = items;
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        // If you're unsure of the exact slugs, normalize; best is to pass correct handles.
        const d = await shopify(GET_CURATED_THREE, {
          h1: normalizeHandle(i1.handle) || i1.handle,
          h2: normalizeHandle(i2.handle) || i2.handle,
          h3: normalizeHandle(i3.handle) || i3.handle,
        });

        if (!cancelled) setData(d);
      } catch (e) {
        console.error(e);
        if (!cancelled) setErr(e?.message || "Failed to load curated collections");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i1.handle, i2.handle, i3.handle]);

  const cards = useMemo(
    () => [
      { cfg: i1, col: data?.c1 },
      { cfg: i2, col: data?.c2 },
      { cfg: i3, col: data?.c3 },
    ],
    [data, i1, i2, i3]
  );

  return (
    <section className="bg-accent px-[5%] pt-10 pb-10">
      {/* Section header */}
      <header className="mx-auto mb-5 max-w-[1200px]">
        <h2 className="text-center cormorant-garamond-700 uppercase text-primary text-3xl md:text-4xl lg:text-4xl">
          DESIGNED FOR YOUR TRUE STYLE
        </h2>
        <p className="montserrat-500 mt-1 text-lg text-primary text-center tracking-[0.025em] leading-snug">
          To make things easier, we’ve gathered your favorites here.
        </p>
      </header>

      {/* Loading state */}
      {loading && (
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Card key={idx} className="border-0 shadow-none">
              <CardContent className="p-0">
                <div className="mb-2 h-4 w-1/2 rounded bg-neutral-200" />
                <AspectRatio ratio={4 / 5} className="rounded-md bg-neutral-100">
                  <Skeleton className="h-full w-full rounded-md" />
                </AspectRatio>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error state */}
      {err && !loading && (
        <div className="mx-auto max-w-[1200px] rounded-md border border-red-200 bg-red-50 px-4 py-3 font-secondary text-red-800">
          Couldn’t load curated collections: {err}
        </div>
      )}

      {/* Content */}
      {!loading && !err && (
        <div className="mx-auto max-w-[1200px]">
          {/* Mobile Carousel (xs only) */}
          <div className="block sm:hidden">
            <Carousel opts={{ align: "center", loop: true }} className="relative">
              <CarouselContent className="-ml-3">
                {cards.map(({ cfg, col }, index) => {
                  const linkHandle =
                    col?.handle || normalizeHandle(cfg.handle) || cfg.handle;
                  const link = `/collections/${linkHandle}`;
                  const imgMeta = getPrimaryImage(col);
                  const alt = imgMeta.alt || col?.title || cfg.label;
                  const isFirst = index === 0;

                  const src = buildSrc(imgMeta.url, 640); // ~mobile max width
                  const srcSet = buildSrcSet(imgMeta.url);

                  return (
                    <CarouselItem key={cfg.handle} className="basis-[78%] pl-3">
                      <article className="flex flex-col gap-2">
                        <div className="montserrat-500 text-[0.8rem] uppercase tracking-[0.12em] text-primary text-center">
                          {cfg.label}
                        </div>
                        <Link href={link} aria-label={`Open ${cfg.label}`}>
                          <div className="rounded-md bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                            <AspectRatio ratio={3 / 4} className="overflow-hidden rounded-md">
                              <Image
                                src={imgMeta.url}
                                alt={alt}
                                fill
                                sizes="(max-width: 480px) 85vw, (max-width: 640px) 90vw, 640px"
                                className="select-none object-cover transition-transform duration-300 hover:scale-[1.04]"
                                priority={isFirst}
                                draggable="false"
                              />
                            </AspectRatio>
                          </div>
                        </Link>
                      </article>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
            </Carousel>
          </div>

          {/* Desktop / Tablet Grid (sm and up) */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map(({ cfg, col }, index) => {
              const linkHandle =
                col?.handle || normalizeHandle(cfg.handle) || cfg.handle;
              const link = `/collections/${linkHandle}`;
              const imgMeta = getPrimaryImage(col);
              const alt = imgMeta.alt || col?.title || cfg.label;
              const isFirst = index === 0;

              // Give desktop/tablet slightly larger default width
              const src = buildSrc(imgMeta.url, 800);
              const srcSet = buildSrcSet(imgMeta.url);

              return (
                <article key={cfg.handle} className="flex flex-col gap-2">
                  <div className="montserrat-500 text-[0.8rem] uppercase tracking-[0.12em] text-primary text-center">
                    {cfg.label}
                  </div>
                  <Link href={link} aria-label={`Open ${cfg.label}`}>
                    <div className="rounded-md bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                      <AspectRatio ratio={3 / 4} className="overflow-hidden rounded-md">
                        <Image
                          src={imgMeta.url}
                          alt={alt}
                          fill
                          sizes="(max-width: 1024px) 45vw, (max-width: 1280px) 30vw, 360px"
                          className="select-none object-cover transition-transform duration-300 hover:scale-[1.04]"
                          priority={isFirst}
                          draggable="false"
                        />
                      </AspectRatio>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
