'use client';
import Link from 'next/link';
import Image from 'next/image';
// src/components/WatchAndBuy.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { shopify } from "@/lib/shopify";
import SectionHeader from "@/components/ui/SectionHeader";

const BRAND = "#642c44";

/* GraphQL: collection → products → media (Video/ExternalVideo) */
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

/** Detect if primary pointer is coarse (touch). */
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

/** Video that plays on hover (desktop) and on press-and-hold (touch). */
function ReelVideo({ src, poster, isTouch }) {
  const ref = useRef(null);
  const holdTimerRef = useRef(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const playedRef = useRef(false);

  const HOLD_MS = 120;
  const MOVE_TOL = 8;

  const playOn = useCallback(() => {
    const v = ref.current;
    if (!v) return Promise.resolve(false);
    try {
      const p = v.play();
      if (p?.then) {
        return p
          .then(() => {
            playedRef.current = true;
            return true;
          })
          .catch(() => false);
      }
      playedRef.current = true;
      return Promise.resolve(true);
    } catch {
      return Promise.resolve(false);
    }
  }, []);

  const pauseOff = useCallback((reset = true) => {
    const v = ref.current;
    if (!v) return;
    try {
      v.pause();
      if (reset) {
        // Force reset to poster
        v.load();
      }
      playedRef.current = false;
    } catch { }
  }, []);

  const clearTimer = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    playedRef.current = false;
    clearTimer();
  }, [src, clearTimer]);

  // Desktop hover preview
  const onMouseEnter = () => {
    if (isTouch) return;
    playOn();
  };
  const onMouseLeave = () => {
    if (isTouch) return;
    pauseOff(true);
  };

  // Touch: press & hold to play; release to pause/reset
  const onTouchStart = (e) => {
    if (!isTouch) return;
    if (!e.touches || e.touches.length === 0) return;
    const t = e.touches[0];
    startPosRef.current = { x: t.clientX, y: t.clientY };

    playOn();
    holdTimerRef.current = setTimeout(() => { }, HOLD_MS);
  };

  const onTouchMove = (e) => {
    if (!isTouch) return;
    if (!e.touches || e.touches.length === 0) return;
    const t = e.touches[0];
    const dx = Math.abs(t.clientX - startPosRef.current.x);
    const dy = Math.abs(t.clientY - startPosRef.current.y);
    if (dx > MOVE_TOL || dy > MOVE_TOL) {
      clearTimer();
      if (playedRef.current) pauseOff(true);
    }
  };

  const onTouchEnd = () => {
    if (!isTouch) return;
    clearTimer();
    if (playedRef.current) pauseOff(true);
  };

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      playsInline
      preload="metadata"
      className="h-full w-full object-cover block select-none rounded-t-2xl"
      controls={false}
      disablePictureInPicture
      disableRemotePlayback
      controlsList="nodownload noplaybackrate noremoteplayback"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}

/** Arrow + scroll management that safely attaches AFTER the track exists */
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

      // Ensure state updates even if the browser doesn't fire scroll events
      // reliably during smooth scroll on first interaction.
      requestAnimationFrame(updateArrows);
      setTimeout(updateArrows, 180);
    },
    [trackRef, getCardWidth, updateArrows]
  );

  // IMPORTANT: Attach listeners whenever the real track is mounted (after loading)
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    updateArrows();

    const onScroll = () => updateArrows();
    el.addEventListener("scroll", onScroll, { passive: true });

    const onResize = () => updateArrows();
    window.addEventListener("resize", onResize);

    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
    };
  }, [trackRef, updateArrows, depsKey]);

  return { canPrev, canNext, scrollByCards, updateArrows };
}

export default function WatchAndBuy({
  handle = "discover-your-look",
  first = 20,
  title = "Discover Your Look",
  smooth = false, // Proposed: smoother interaction (drag for mouse, etc.)
}) {
  const trackRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [collectionData, setCollectionData] = useState(null);
  const isTouch = useIsTouch();

  /* --- MOUSE DRAG-TO-SCROLL (only if smooth=true) --- */
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  // To prevent Click event after drag
  const [hasMoved, setHasMoved] = useState(false);

  const onMouseDown = (e) => {
    if (!smooth || isTouch || !trackRef.current) return;
    setIsDragging(true);
    setHasMoved(false);
    setStartX(e.pageX - trackRef.current.offsetLeft);
    setScrollLeft(trackRef.current.scrollLeft);
    trackRef.current.style.scrollSnapType = "none";
    trackRef.current.style.scrollBehavior = "auto";
  };

  const onMouseMove = (e) => {
    if (!isDragging || !trackRef.current) return;
    e.preventDefault();
    const x = e.pageX - trackRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // multiplier for speed
    if (Math.abs(walk) > 3) setHasMoved(true);
    trackRef.current.scrollLeft = scrollLeft - walk;
  };

  const onMouseUpOrLeave = () => {
    if (!isDragging || !trackRef.current) return;
    setIsDragging(false);
    trackRef.current.style.scrollSnapType = "x mandatory";
    trackRef.current.style.scrollBehavior = "smooth";
  };

  // Prevent internal link clicks if we dragged
  const handleLinkClick = (e) => {
    if (hasMoved) {
      e.preventDefault();
    }
  };

  // Fetch collection reels (videos) from Shopify
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await shopify(GET_COLLECTION_REELS, { handle, first });
        if (!cancelled) setCollectionData(res);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError(e?.message || "Failed to load videos");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [handle, first]);

  // Pick a playable source (prefer mp4, then webm). Skip HLS/DASH.
  const pickPlayableSource = (sources = []) => {
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
  };

  // Map Shopify data → reels
  const reels = useMemo(() => {
    const edges = collectionData?.collection?.products?.edges ?? [];
    const items = [];

    for (const { node } of edges) {
      const mediaEdges = node.media?.edges ?? [];

      let previewUrl =
        node.images?.edges?.[0]?.node?.url ||
        mediaEdges?.[0]?.node?.previewImage?.url ||
        "";
      let previewAlt =
        node.images?.edges?.[0]?.node?.altText ||
        mediaEdges?.[0]?.node?.previewImage?.altText ||
        node.title;

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
          if (!previewUrl) {
            previewUrl = videoMedia.node.previewImage?.url || "";
            previewAlt = videoMedia.node.previewImage?.altText || node.title;
          }
        }
      }

      if (!src) {
        const extMedia = mediaEdges.find((m) => m?.node?.mediaContentType === "EXTERNAL_VIDEO");
        if (extMedia) {
          type = "external";
          src = extMedia.node.embeddedUrl || "";
          const extPrev = extMedia.node.previewImage?.url;
          if (extPrev) {
            previewUrl = extPrev;
            previewAlt = extMedia.node.previewImage?.altText || previewAlt;
          }
        }
      }

      if (!src && previewUrl) {
        type = "image";
        src = previewUrl;
      }

      if (type && src) {
        items.push({
          id: node.id,
          productName: node.title,
          productLink: `/products/${node.handle}`,
          type,
          src,
          thumbnail: previewUrl,
          alt: previewAlt || node.title,
        });
      }
    }

    return items;
  }, [collectionData]);

  // Arrow hook must re-attach after loading (track appears), so we pass a depsKey
  const depsKey = `${loading}-${reels.length}`;
  const { canPrev, canNext, scrollByCards, updateArrows } = useCarouselArrows(
    trackRef,
    depsKey
  );
  const collectionTitle = collectionData?.collection?.title || title;
  const collectionLink = `/collections/${collectionData?.collection?.handle || handle}`;

  // Refresh arrows when reels change (content width changes)
  useEffect(() => {
    const id = requestAnimationFrame(() => updateArrows?.());
    return () => cancelAnimationFrame(id);
  }, [reels.length, updateArrows]);

  if (loading) {
    return (
      <section className="px-[5%] pt-10 pb-6 md:pb-10">
        <SectionHeader
          title={title}
          subtitle="Shop by your mood & moment"
          className="mb-6 md:mb-8"
        />
        <div className="flex gap-5 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              data-card
              className="flex-none w-[240px] sm:w-[260px] lg:w-[280px] rounded-2xl overflow-hidden bg-neutral-100"
            >
              <AspectRatio ratio={11 / 16} className="w-full bg-neutral-100 rounded-t-2xl" />
              <div className="h-[90px] p-3 bg-white" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-white px-5 pt-10 pb-6 sm:px-[5%] md:pb-10">
        <SectionHeader title={title} className="mb-6 md:mb-8" />
        <p className="text-center montserrat-500 text-primary/80">Error: {error}</p>
      </section>
    );
  }

  if (reels.length === 0) {
    return (
      <section className="bg-white px-5 pt-10 pb-6 sm:px-[5%] md:pb-10">
        <SectionHeader title={title} className="mb-6 md:mb-8" />
        <p className="text-center montserrat-500 text-primary/80">
          No videos found in “{collectionData?.collection?.title || handle}”.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-white px-3 pt-10 pb-6 sm:px-[5%] md:pb-10 overflow-x-hidden">
      <style>{`
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .no-scrollbar::-webkit-scrollbar {
          width: 0 !important;
          height: 0 !important;
        }
      `}</style>

      <SectionHeader
        title={collectionTitle}
        subtitle="Hover or hold to preview the look."
        className="mb-6 md:mb-8"
      />

      <div className="relative">
        {/* Left Arrow — desktop only */}
        <button
          onClick={() => scrollByCards(-1)}
          disabled={!canPrev}
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 flex-shrink-0 w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full bg-primary text-white shadow-lg md:shadow-xl items-center justify-center hover:scale-110 transition-all duration-300 z-30 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          aria-label="Scroll left"
          type="button"
        >
          <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" />
        </button>

        {/* Right Arrow — desktop only */}
        <button
          onClick={() => scrollByCards(1)}
          disabled={!canNext}
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 flex-shrink-0 w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full bg-primary text-white shadow-lg md:shadow-xl items-center justify-center hover:scale-110 transition-all duration-300 z-30 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          aria-label="Scroll right"
          type="button"
        >
          <ChevronRight className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" />
        </button>

        {/* Track */}
        <div
          ref={trackRef}
          role="region"
          aria-label="Reels carousel"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUpOrLeave}
          onMouseLeave={onMouseUpOrLeave}
          className={`
            relative z-10
            flex gap-5 overflow-x-auto overflow-y-hidden px-1 py-2 scroll-smooth
            snap-x ${smooth ? "snap-proximity" : "snap-mandatory"} 
            ${smooth && !isTouch ? (isDragging ? "cursor-grabbing" : "cursor-grab") : ""}
            no-scrollbar
            [-webkit-overflow-scrolling:touch] [overscroll-behavior-x:contain]
            ${isDragging ? "select-none" : ""}
          `}
        >
          {reels.map((item) => {
            const isVideo = item.type === "video";

            return (
              <div
                key={item.id}
                data-card
                className="flex-none w-[200px] sm:w-[220px] lg:w-[240px] rounded-lg overflow-hidden border border-black/8 shadow-sm snap-start bg-white"
              >
                <AspectRatio ratio={11 / 16} className="w-full">
                  {isVideo ? (
                    <ReelVideo
                      src={item.src}
                      poster={item.thumbnail || undefined}
                      isTouch={isTouch}
                    />
                  ) : (
                    <Image
                      src={item.thumbnail || item.src}
                      alt={item.alt}
                      fill
                      className="object-cover block select-none"
                      draggable="false"
                    />
                  )}
                </AspectRatio>

                {/* Card info — clean, no heavy CTA */}
                <div className="p-3 flex flex-col gap-1">
                  <Link href={item.productLink}
                    onClick={handleLinkClick}
                    className="block truncate montserrat-500 text-[13px] sm:text-[14px] leading-snug text-[#2d2d2d] hover:text-primary transition-colors tracking-[0.15em] uppercase"
                    title={item.productName}
                  >
                    {item.productName}
                  </Link>
                  <Button
                    asChild
                    size="sm"
                    className="mt-2 h-8 w-fit rounded-md border border-[#c6d4ee] bg-white px-4 text-[10px] montserrat-600 uppercase tracking-[0.18em] text-[#642c44] shadow-none transition-all duration-300 hover:border-[#642c44] hover:bg-[#642c44] hover:text-white"
                  >
                    <Link href={item.productLink} onClick={handleLinkClick}>
                      Shop Now
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-5 flex justify-center md:mt-6">
        <Link href={collectionLink}
          className="inline-flex items-center justify-center rounded-lg border border-primary px-6 py-3 text-[11px] md:text-[12px] montserrat-600 uppercase tracking-[0.16em] text-primary transition-colors duration-200 hover:bg-primary hover:text-white"
        >
          View All
        </Link>
      </div>
    </section>
  );
}
