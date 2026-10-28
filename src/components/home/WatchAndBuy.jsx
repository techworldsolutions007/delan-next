'use client';
import Link from 'next/link';
import Image from 'next/image';
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import { shopify } from "@/lib/shopify";

const DYL_EVENT = 'dyl:playing';

const GET_COLLECTION_REELS = /* GraphQL */ `
  query CollectionReels($handle: String!, $first: Int = 20) {
    collection(handle: $handle) {
      id
      title
      handle
      products(first: $first) {
        edges {
          node {
            id
            title
            handle
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            media(first: 10) {
              edges {
                node {
                  mediaContentType
                  previewImage { url altText }
                  ... on Video {
                    sources { url mimeType }
                  }
                  ... on ExternalVideo {
                    embeddedUrl
                    host
                    previewImage { url altText }
                  }
                }
              }
            }
            images(first: 1) {
              edges { node { url altText } }
            }
          }
        }
      }
    }
  }
`;

function useIsTouch() {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(pointer: coarse)");
    const update = () => setIsTouch(!!mq?.matches);
    update();
    mq?.addEventListener?.("change", update);
    return () => mq?.removeEventListener?.("change", update);
  }, []);
  return isTouch;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const update = (e) => setReduced(e.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}

function useCarouselArrows(trackRef, depsKey) {
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const getCardWidth = useCallback(() => {
    const track = trackRef.current;
    if (!track) return 300;
    const card = track.querySelector("[data-card]");
    if (!card) return 300;
    const rect = card.getBoundingClientRect();
    const styles = window.getComputedStyle(track);
    const gap = parseFloat(styles.columnGap || styles.gap || "0");
    return rect.width + gap;
  }, [trackRef]);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const tol = 2;
    setCanPrev(el.scrollLeft > tol);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - tol);
  }, [trackRef]);

  const scrollByCards = useCallback(
    (n) => {
      const el = trackRef.current;
      if (!el) return;
      const step = getCardWidth();
      el.scrollBy({ left: n * step, behavior: "smooth" });
      requestAnimationFrame(updateArrows);
      setTimeout(updateArrows, 180);
    },
    [trackRef, getCardWidth, updateArrows]
  );

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateArrows();
    const onScroll = () => updateArrows();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateArrows);
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateArrows);
      ro.disconnect();
    };
  }, [trackRef, updateArrows, depsKey]);

  return { canPrev, canNext, scrollByCards, updateArrows };
}

function formatPrice(amount, currencyCode) {
  if (!amount) return null;
  const num = parseFloat(amount);
  if (isNaN(num)) return null;
  if (currencyCode === 'INR') {
    return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }
  return `${currencyCode} ${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}


function VideoProductCard({ item, isTouch, prefersReducedMotion, onLinkClick }) {
  const [hovered, setHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);
  const hoverTimer = useRef(null);
  const containerRef = useRef(null);
  const hasVideo = item.type === 'video' && !!item.src;

  const stopVideo = useCallback(() => {
    clearTimeout(hoverTimer.current);
    const v = videoRef.current;
    if (v) {
      try { v.pause(); v.load(); } catch { }
    }
    setIsPlaying(false);
    setHovered(false);
  }, []);

  const startVideo = useCallback(async () => {
    const v = videoRef.current;
    if (!v || !hasVideo) return;
    window.dispatchEvent(new CustomEvent(DYL_EVENT, { detail: { id: item.id } }));
    try {
      await v.play();
      setIsPlaying(true);
    } catch {
      setHovered(false);
      setIsPlaying(false);
    }
  }, [hasVideo, item.id]);

  // Pause when another card starts playing
  useEffect(() => {
    const handler = (e) => { if (e.detail?.id !== item.id) stopVideo(); };
    window.addEventListener(DYL_EVENT, handler);
    return () => window.removeEventListener(DYL_EVENT, handler);
  }, [item.id, stopVideo]);

  // Pause on tab hide
  useEffect(() => {
    const handler = () => { if (document.hidden) stopVideo(); };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [stopVideo]);

  // Pause when scrolled out of view
  useEffect(() => {
    if (!hasVideo || !containerRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (!entry.isIntersecting) stopVideo(); },
      { threshold: 0.1 }
    );
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [hasVideo, stopVideo]);

  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  const onMouseEnter = () => {
    if (isTouch || !hasVideo || prefersReducedMotion) return;
    hoverTimer.current = setTimeout(() => {
      setHovered(true);
      startVideo();
    }, 150);
  };

  const onMouseLeave = () => {
    if (isTouch) return;
    stopVideo();
  };

  const toggleMobilePlay = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPlaying) {
      stopVideo();
    } else {
      setHovered(true);
      startVideo();
    }
  };

  const transitionCls = prefersReducedMotion ? '' : 'transition-opacity duration-300';

  return (
    <div ref={containerRef}>
      {/* ── Image / video area ── */}
      <div
        className="relative aspect-[3/4] overflow-hidden"
        onMouseEnter={!isTouch ? onMouseEnter : undefined}
        onMouseLeave={!isTouch ? onMouseLeave : undefined}
      >
        {/* Invisible full-area PDP link (below play button on mobile) */}
        <Link
          href={item.productLink}
          className="absolute inset-0 z-10"
          aria-label={`View ${item.productName}`}
          onClick={onLinkClick}
        />

        {/* Static product image */}
        <Image
          src={item.thumbnail || item.src}
          alt={item.alt}
          fill
          className={`object-cover select-none ${transitionCls} ${hovered ? 'opacity-0' : 'opacity-100'}`}
          draggable="false"
          sizes="(max-width: 640px) 76vw, (max-width: 768px) 46vw, (max-width: 1024px) 32vw, 300px"
        />

        {/* Video — fades in on hover (desktop) or tap-play (mobile) */}
        {hasVideo && (
          <video
            ref={videoRef}
            src={item.src}
            poster={item.thumbnail || undefined}
            muted
            playsInline
            loop
            preload="none"
            className={`absolute inset-0 h-full w-full object-cover select-none ${transitionCls} ${hovered ? 'opacity-100' : 'opacity-0'}`}
            disablePictureInPicture
            disableRemotePlayback
            controlsList="nodownload noplaybackrate noremoteplayback"
            onContextMenu={(e) => e.preventDefault()}
          />
        )}

        {/* "VIEW PIECE →" gradient overlay — desktop hover only */}
        {!isTouch && (
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/50 to-transparent pt-16 pb-5 flex items-end justify-center ${transitionCls} ${hovered ? 'opacity-100' : 'opacity-0'}`}
          >
            <span className="text-white text-[9px] montserrat-600 tracking-[0.25em] uppercase">
              VIEW PIECE →
            </span>
          </div>
        )}

        {/* Small play indicator — desktop, card-at-rest */}
        {hasVideo && !isTouch && !prefersReducedMotion && (
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute bottom-3 right-3 z-20 w-7 h-7 rounded-full bg-white/75 backdrop-blur-sm flex items-center justify-center ${transitionCls} ${hovered ? 'opacity-0' : 'opacity-100'}`}
          >
            <Play className="w-3 h-3 text-primary fill-current ml-0.5" />
          </div>
        )}

        {/* Mobile play / pause button — sits above the full-area link */}
        {hasVideo && isTouch && (
          <button
            onClick={toggleMobilePlay}
            type="button"
            aria-label={isPlaying ? "Pause video" : "Play video"}
            className="absolute bottom-3 right-3 z-20 w-9 h-9 rounded-full bg-white/85 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform duration-150"
          >
            {isPlaying
              ? <Pause className="w-3.5 h-3.5 text-primary" />
              : <Play className="w-3 h-3 text-primary fill-current ml-0.5" />
            }
          </button>
        )}
      </div>

      {/* ── Product info ── */}
      <div className="space-y-1 px-0.5 pb-1 pt-3">
        <Link href={item.productLink} onClick={onLinkClick} className="block">
          <h3
            className="truncate text-[12px] leading-snug text-[#2d2d2d] md:text-[13px] montserrat-500 tracking-[0.05em] sm:tracking-[0.15em] uppercase"
            title={item.productName}
          >
            {item.productName}
          </h3>
          {item.price && (
            <p className="text-[12px] leading-snug md:text-[13px] montserrat-600 tracking-[0.05em] sm:tracking-[0.15em] uppercase text-primary">
              {item.price}
            </p>
          )}
        </Link>
      </div>
    </div>
  );
}

function pickPlayableSource(sources = []) {
  if (!Array.isArray(sources)) return null;
  const norm = (s) => String(s?.mimeType || "").toLowerCase();
  const mp4 = sources.find((s) => norm(s).includes("video/mp4"));
  if (mp4?.url) return mp4.url;
  const webm = sources.find((s) => norm(s).includes("video/webm"));
  if (webm?.url) return webm.url;
  const any = sources.find(
    (s) => s?.url && !/\.m3u8($|\?)/i.test(s.url) && !/\.mpd($|\?)/i.test(s.url)
  );
  return any?.url || null;
}

export default function WatchAndBuy({
  handle = "discover-your-look",
  first = 20,
  title = "Discover Your Look",
}) {
  const trackRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [collectionData, setCollectionData] = useState(null);
  const isTouch = useIsTouch();
  const prefersReducedMotion = usePrefersReducedMotion();

  /* ── Drag-to-scroll (mouse) ── */
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, left: 0, moved: false });

  const onMouseDown = (e) => {
    if (isTouch || !trackRef.current) return;
    setIsDragging(true);
    dragStart.current = { x: e.pageX - trackRef.current.offsetLeft, left: trackRef.current.scrollLeft, moved: false };
    trackRef.current.style.scrollSnapType = "none";
    trackRef.current.style.scrollBehavior = "auto";
  };
  const onMouseMove = (e) => {
    if (!isDragging || !trackRef.current) return;
    e.preventDefault();
    const x = e.pageX - trackRef.current.offsetLeft;
    const walk = (x - dragStart.current.x) * 1.5;
    if (Math.abs(walk) > 3) dragStart.current.moved = true;
    trackRef.current.scrollLeft = dragStart.current.left - walk;
  };
  const onMouseUpOrLeave = () => {
    if (!isDragging || !trackRef.current) return;
    setIsDragging(false);
    trackRef.current.style.scrollSnapType = "x mandatory";
    trackRef.current.style.scrollBehavior = "smooth";
  };
  const handleLinkClick = (e) => { if (dragStart.current.moved) e.preventDefault(); };

  /* ── Fetch ── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await shopify(GET_COLLECTION_REELS, { handle, first });
        if (!cancelled) setCollectionData(res);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [handle, first]);

  /* ── Map Shopify data → reels ── */
  const reels = useMemo(() => {
    const edges = collectionData?.collection?.products?.edges ?? [];
    const items = [];
    for (const { node } of edges) {
      const mediaEdges = node.media?.edges ?? [];
      let previewUrl = node.images?.edges?.[0]?.node?.url || mediaEdges?.[0]?.node?.previewImage?.url || "";
      let previewAlt = node.images?.edges?.[0]?.node?.altText || mediaEdges?.[0]?.node?.previewImage?.altText || node.title;
      let type = null;
      let src = null;

      const videoMedia = mediaEdges.find(
        (m) => m?.node?.mediaContentType === "VIDEO" && (m.node?.sources?.length || 0) > 0
      );
      if (videoMedia) {
        const playable = pickPlayableSource(videoMedia.node.sources);
        if (playable) {
          type = "video";
          src = playable;
          if (!previewUrl) { previewUrl = videoMedia.node.previewImage?.url || ""; previewAlt = videoMedia.node.previewImage?.altText || previewAlt; }
        }
      }
      if (!src) {
        const extMedia = mediaEdges.find((m) => m?.node?.mediaContentType === "EXTERNAL_VIDEO");
        if (extMedia) { type = "external"; src = extMedia.node.embeddedUrl || ""; }
      }
      if (!src && previewUrl) { type = "image"; src = previewUrl; }

      if (type && src) {
        const priceObj = node.priceRange?.minVariantPrice;
        items.push({
          id: node.id,
          productName: node.title,
          productLink: `/products/${node.handle}`,
          type,
          src,
          thumbnail: previewUrl,
          alt: previewAlt || node.title,
          price: formatPrice(priceObj?.amount, priceObj?.currencyCode),
        });
      }
    }
    return items;
  }, [collectionData]);

  const depsKey = `${loading}-${reels.length}`;
  const { canPrev, canNext, scrollByCards, updateArrows } = useCarouselArrows(trackRef, depsKey);
  const collectionTitle = collectionData?.collection?.title || title;
  const collectionLink = `/collections/${collectionData?.collection?.handle || handle}`;

  useEffect(() => {
    const id = requestAnimationFrame(() => updateArrows?.());
    return () => cancelAnimationFrame(id);
  }, [reels.length, updateArrows]);

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <section className="bg-white px-3 sm:px-6 lg:px-10 pt-10 md:pt-14 overflow-x-hidden">
        <div className="mb-6 md:mb-8 text-center">
          <div className="h-9 md:h-11 bg-neutral-100 rounded animate-pulse mx-auto w-72" />
        </div>
        <div className="flex gap-4 lg:gap-5 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} data-card className="flex-none w-[76vw] sm:w-[46vw] md:w-[32vw] lg:w-[280px] xl:w-[300px]">
              <div className="aspect-[3/4] bg-neutral-100 animate-pulse" />
              <div className="pt-3 space-y-2">
                <div className="h-4 bg-neutral-100 rounded animate-pulse w-4/5" />
                <div className="h-3 bg-neutral-100 rounded animate-pulse w-2/5" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-white px-3 sm:px-6 lg:px-10 pt-10 md:pt-14">
        <p className="text-center montserrat-500 text-primary/80">Error loading section.</p>
      </section>
    );
  }

  if (reels.length === 0) return null;

  return (
    <section className="bg-white px-3 sm:px-6 lg:px-10 pt-10 md:pt-14 overflow-x-hidden">

      {/* ── Section header ── */}
      <div className="mb-6 md:mb-8 text-center">
        <h2 className="cormorant-garamond-700 uppercase text-primary text-3xl md:text-4xl lg:text-[2.6rem] leading-[1.15] tracking-[0.02em]">
          {collectionTitle}
        </h2>
      </div>

      {/* ── Carousel + arrows ── */}
      <div className="relative">
        {/* Left arrow — desktop only */}
        <button
          onClick={() => scrollByCards(-1)}
          disabled={!canPrev}
          aria-label="Scroll left"
          type="button"
          className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white shadow-lg items-center justify-center hover:bg-primary/90 transition-all duration-300 z-30 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Right arrow — desktop only */}
        <button
          onClick={() => scrollByCards(1)}
          disabled={!canNext}
          aria-label="Scroll right"
          type="button"
          className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 flex-shrink-0 w-10 h-10 rounded-full bg-primary text-white shadow-lg items-center justify-center hover:bg-primary/90 transition-all duration-300 z-30 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Track */}
        <div
          ref={trackRef}
          role="region"
          aria-label="Discover Your Look carousel"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUpOrLeave}
          onMouseLeave={onMouseUpOrLeave}
          className={`flex gap-4 lg:gap-5 overflow-x-auto overflow-y-hidden scroll-smooth snap-x snap-mandatory no-scrollbar [-webkit-overflow-scrolling:touch] [overscroll-behavior-x:contain] ${isDragging ? 'cursor-grabbing select-none' : 'cursor-default'}`}
        >
          {reels.map((item) => (
            <div
              key={item.id}
              data-card
              className="flex-none w-[76vw] sm:w-[46vw] md:w-[32vw] lg:w-[280px] xl:w-[300px] snap-start"
            >
              <VideoProductCard
                item={item}
                isTouch={isTouch}
                prefersReducedMotion={prefersReducedMotion}
                onLinkClick={handleLinkClick}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── View All — hidden on mobile ── */}
      <div className="hidden sm:flex mt-6 md:mt-8 justify-center">
        <Link
          href={collectionLink}
          className="inline-flex items-center justify-center rounded-lg border border-primary px-8 py-3 text-[11px] md:text-[12px] montserrat-600 uppercase tracking-[0.16em] text-primary transition-colors duration-200 hover:bg-primary hover:text-white"
        >
          View All
        </Link>
      </div>
    </section>
  );
}
