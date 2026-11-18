'use client';
import Link from 'next/link';
import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { shopify } from '@/lib/shopify';

// Media order in the Shopify product:
//   [0] desktop_video     — PC/desktop video source
//   [1] desktop_thumbnail — poster shown on desktop while video loads
//   [2] mobile_video      — mobile video source
//   [3] mobile_thumbnail  — poster shown on mobile while video loads
const HERO_PRODUCT_HANDLE = 'herovidsectionforthemobileandpc';

// Fallback URLs used while the fetch is in-flight or if it fails
const FALLBACK_DESKTOP = "https://cdn.shopify.com/videos/c/o/v/f849721f47a942a5bd6850ffb627e23e.mp4";
const FALLBACK_MOBILE  = "https://cdn.shopify.com/videos/c/o/v/b6edf78cefac48269f175b09c93349cf.mp4";
// Fallback href: product not live → keep old collection
const FALLBACK_HREF = '/collections/summer-somewhere';
// Active href: product is live → point to current campaign
const ACTIVE_HREF   = '/collections/second-skin';

const GET_HERO_MEDIA = `
  query GetHeroMedia($handle: String!) {
    product(handle: $handle) {
      media(first: 4) {
        nodes {
          ... on Video {
            sources { url mimeType }
          }
          ... on MediaImage {
            image { url }
          }
        }
      }
    }
  }
`;

function getMp4Url(sources) {
  if (!sources?.length) return null;
  return (
    sources.find(s => s.mimeType === 'video/mp4')?.url ??
    sources[0]?.url ??
    null
  );
}

const VIDEO_RATIO_MOBILE  = "9/16";
const VIDEO_RATIO_DESKTOP = "21/9";

const HERO_POSTER =
  "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/WhatsApp_Image_2026-07-13_at_1.10.42_PM.jpg?v=1783928461";

function detectIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}

export default function HeroSlider() {
  const [isIOS, setIsIOS]           = useState(false);
  const [desktopSrc, setDesktopSrc] = useState(FALLBACK_DESKTOP);
  const [mobileSrc, setMobileSrc]   = useState(FALLBACK_MOBILE);
  const [poster, setPoster]         = useState(HERO_POSTER);
  const [shopNowHref, setShopNowHref] = useState(FALLBACK_HREF);
  const videoRef    = useRef(null);
  const didFetchRef = useRef(false);
  const isIOSRef    = useRef(false);

  useEffect(() => {
    isIOSRef.current = isIOS;
  }, [isIOS]);

  // iOS detection (client-only)
  useEffect(() => {
    setIsIOS(detectIOS());
  }, []);

  // Fetch media + collection redirect from the Shopify product
  useEffect(() => {
    shopify(GET_HERO_MEDIA, { handle: HERO_PRODUCT_HANDLE })
      .then(data => {
        const product = data?.product;

        // Storefront API returns null for unpublished products.
        // If product is live, switch the Shop Now link to the active campaign.
        if (product) {
          setShopNowHref(ACTIVE_HREF);
        }

        const nodes = product?.media?.nodes ?? [];

        const desktop_video     = nodes[0];
        const desktop_thumbnail = nodes[1];
        const mobile_video      = nodes[2];
        const mobile_thumbnail  = nodes[3];

        const d = getMp4Url(desktop_video?.sources);
        const m = getMp4Url(mobile_video?.sources);

        // Pick the right thumbnail based on the current viewport
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        const p = isMobile
          ? (mobile_thumbnail?.image?.url  ?? desktop_thumbnail?.image?.url ?? null)
          : (desktop_thumbnail?.image?.url ?? mobile_thumbnail?.image?.url  ?? null);

        if (d || m) {
          if (d) setDesktopSrc(d);
          if (m) setMobileSrc(m);
          didFetchRef.current = true;
        }
        if (p) setPoster(p);
      })
      .catch(() => {
        // Fetch failed — fallbacks (URLs + href) stay as-is
      });
  }, []);

  // Initial autoplay (runs on mount with the fallback URLs)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const delay = isIOS ? 1500 : 500;
    const t = setTimeout(() => {
      video.muted = true;
      video.playsInline = true;
      video.play()?.catch(() => {});
    }, delay);
    return () => clearTimeout(t);
  }, [isIOS]);

  // Reload + re-play whenever fetched URLs replace the fallbacks
  useEffect(() => {
    if (!didFetchRef.current) return;
    const video = videoRef.current;
    if (!video) return;
    video.load();
    const delay = isIOSRef.current ? 1200 : 200;
    const t = setTimeout(() => {
      video.muted = true;
      video.playsInline = true;
      video.play()?.catch(() => {});
    }, delay);
    return () => clearTimeout(t);
  }, [desktopSrc, mobileSrc]);

  return (
    <div
      role="region"
      aria-label="Hero slider"
      aria-roledescription="carousel"
      aria-live="polite"
      className="relative w-full overflow-hidden bg-neutral-100 group"
      style={{ aspectRatio: VIDEO_RATIO_MOBILE, height: 'auto' }}
    >
      <style>{`
        @media (min-width: 768px) {
          [aria-label="Hero slider"] {
            aspect-ratio: ${VIDEO_RATIO_DESKTOP} !important;
          }
        }
      `}</style>

      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        muted
        loop
        playsInline
        autoPlay
        preload={isIOS ? "none" : "metadata"}
        poster={poster}
        controls={false}
        disablePictureInPicture
        aria-label="Delan hero video"
        suppressHydrationWarning
      >
        <source src={desktopSrc} type="video/mp4" media="(min-width: 768px)" />
        <source src={mobileSrc}  type="video/mp4" media="(max-width: 767px)" />
        Your browser does not support the video tag.
      </video>

      {/* Bottom gradient overlay */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent pointer-events-none transition-opacity duration-300 group-hover:from-black/60" />

      {/* CTA */}
      <div className="absolute inset-x-0 bottom-25 md:bottom-12 flex flex-col justify-center items-center z-10 gap-4 -translate-y-[20px] md:-translate-y-[5px]">
        <h1 className="sr-only">
          <span>Premium Women&apos;s Fashion</span>
          <span>Co-ord Sets · Dresses · Ethnic Wear · India</span>
        </h1>
        <Button
          asChild
          className="montserrat-700 uppercase leading-snug tracking-[0.3em] py-5 px-5 text-[14px] md:text-[15px] border border-white bg-transparent text-white hover:bg-white hover:text-primary transition-all duration-300 shadow-lg"
        >
          <Link href={shopNowHref}>
            Shop Now
          </Link>
        </Button>
      </div>
    </div>
  );
}
