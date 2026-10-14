'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
// src/components/SuggestionPopUp.jsx
import React, { useEffect, useState, useCallback } from "react";
import { shopify } from "@/lib/shopify";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";

// Query current product (for id/handle to exclude)
const GET_PRODUCT_BY_HANDLE = `
  query getProductByHandle($handle: String!) {
    product(handle: $handle) {
      id
      handle
      title
      images(first: 3) { edges { node { url altText } } }
    }
  }
`;

// Try recommendations first
const GET_PRODUCT_RECOMMENDATIONS = `
  query ProductRecommendations($productId: ID!) {
    productRecommendations(productId: $productId) {
      id
      handle
      title
      images(first: 3) { edges { node { url altText } } }
    }
  }
`;

// Fallback list
const GET_FALLBACK_PRODUCTS = `
  query FallbackProducts($first: Int!) {
    products(first: $first) {
      edges {
        node {
          id
          handle
          title
          images(first: 3) { edges { node { url altText } } }
        }
      }
    }
  }
`;

// All-female names
const PEOPLE = [
  "Ananya", "Tanisha", "Isha", "Kiara", "Meera", "Diya", "Saanvi", "Riya", "Aaradhya",
  "Nisha", "Avni", "Aisha", "Ira", "Sara", "Priya", "Mira", "Tara"
];

const TIME_LABELS = [
  "Just now", "2 minutes ago", "5 minutes ago", "6 minutes ago",
  "9 minutes ago", "12 minutes ago", "15 minutes ago", "18 minutes ago"
];

export default function SuggestionPopUp({
  initialOpen = true,
  showDelayMs = 15000,
  threshold = 400, // Show after scrolling 400px
  idleBeforeRotateMs = 20000,
  rotateDelayMs = 15000,
}) {
  const { handle: routeHandle } = useParams();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scrolledBeyond, setScrolledBeyond] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [interactionTick, setInteractionTick] = useState(0);

  // Store ALL candidates to cycle through
  const [candidates, setCandidates] = useState([]);

  // Current display state
  const [currentProduct, setCurrentProduct] = useState(null);
  const [person, setPerson] = useState(PEOPLE[0]);
  const [timeLabel, setTimeLabel] = useState(TIME_LABELS[0]);

  // Handle Scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!scrolledBeyond && window.scrollY > threshold) {
        setScrolledBeyond(true);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    // Check initial Scroll
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold, scrolledBeyond]);

  const randomizeMeta = useCallback(() => {
    setPerson(PEOPLE[Math.floor(Math.random() * PEOPLE.length)]);
    setTimeLabel(TIME_LABELS[Math.floor(Math.random() * TIME_LABELS.length)]);
  }, []);

  const pickRandomProduct = useCallback((list) => {
    if (!list || list.length === 0) return null;
    return list[Math.floor(Math.random() * list.length)];
  }, []);

  const pickNextProduct = useCallback((list, currentHandle) => {
    if (!list || list.length === 0) return null;
    const pool = list.filter((item) => item?.handle && item.handle !== currentHandle);
    return pickRandomProduct(pool.length ? pool : list);
  }, [pickRandomProduct]);

  const markInteraction = useCallback(() => {
    setInteractionTick((value) => value + 1);
  }, []);

  const edgeNodes = (edges = []) => edges.map((e) => e?.node).filter(Boolean);

  // 1. Fetch Candidates (Once per route change)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!routeHandle) {
        setLoading(false);
        setCandidates([]);
        return;
      }

      try {
        setLoading(true);

        // a) Get current product to exclude
        const base = await shopify(GET_PRODUCT_BY_HANDLE, { handle: routeHandle });
        if (cancelled) return;
        const curr = base?.product;
        const currentHandle = curr?.handle;
        const currentId = curr?.id;

        const normalize = (p) => {
          const img = p?.images ? edgeNodes(p.images.edges)[0] : null;
          return {
            id: p?.id,
            handle: p?.handle,
            title: p?.title,
            imageUrl: img?.url || "",
            imageAlt: img?.altText || p?.title || "Product image",
          };
        };

        // b) Get Recommendations
        let potentials = [];
        if (currentId) {
          const recResp = await shopify(GET_PRODUCT_RECOMMENDATIONS, { productId: currentId });
          if (!cancelled) {
            const recs = recResp?.productRecommendations || [];
            potentials.push(...recs);
          }
        }

        // c) Fallback if low on recs
        if (potentials.length < 5) {
          const fbResp = await shopify(GET_FALLBACK_PRODUCTS, { first: 20 });
          if (!cancelled) {
            const items = edgeNodes(fbResp?.products?.edges || []);
            potentials.push(...items);
          }
        }

        // Filter valid & exclude current
        const valid = potentials
          .filter((p) => p && p.handle && p.handle !== currentHandle)
          .map(normalize);

        // Deduplicate by handle
        const unique = [];
        const set = new Set();
        for (const p of valid) {
          if (!set.has(p.handle)) {
            set.add(p.handle);
            unique.push(p);
          }
        }

        setCandidates(unique);
      } catch (err) {
        console.error("Suggestion fetch error", err);
        if (!cancelled) setCandidates([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [routeHandle]);


  // 2. Initial show: after scroll threshold, wait showDelayMs then show first suggestion
  const [hasShownInitial, setHasShownInitial] = useState(false);

  useEffect(() => {
    if (loading || candidates.length === 0 || !scrolledBeyond || hasShownInitial || dismissed || !initialOpen) return;

    const t = setTimeout(() => {
      const prod = pickNextProduct(candidates, currentProduct?.handle);
      if (prod) {
        setCurrentProduct(prod);
        randomizeMeta();
        setOpen(true);
        setHasShownInitial(true);
      }
    }, showDelayMs);

    return () => clearTimeout(t);
  }, [loading, candidates, scrolledBeyond, hasShownInitial, dismissed, initialOpen, showDelayMs, pickNextProduct, currentProduct?.handle, randomizeMeta]);

  // Reset state immediately when route changes
  useEffect(() => {
    setOpen(false);
    setCurrentProduct(null);
    setCandidates([]);
    setScrolledBeyond(false);
    setHasShownInitial(false);
    setDismissed(false);
    setInteractionTick(0);
  }, [routeHandle]);

  // 3. Idle rotation: if left untouched for 20s, rotate after another 15s.
  useEffect(() => {
    if (!open || dismissed || loading || candidates.length < 2) return;

    let rotateTimer;
    const idleTimer = setTimeout(() => {
      rotateTimer = setTimeout(() => {
        if (dismissed) return;
        const nextProd = pickNextProduct(candidates, currentProduct?.handle);
        if (nextProd) {
          setCurrentProduct(nextProd);
          randomizeMeta();
        }
      }, rotateDelayMs);
    }, idleBeforeRotateMs);

    return () => {
      clearTimeout(idleTimer);
      if (rotateTimer) clearTimeout(rotateTimer);
    };
  }, [
    open,
    dismissed,
    loading,
    candidates,
    currentProduct?.handle,
    interactionTick,
    idleBeforeRotateMs,
    rotateDelayMs,
    pickNextProduct,
    randomizeMeta,
  ]);

  const handleDismiss = useCallback(() => {
    setOpen(false);
    setDismissed(true);
  }, []);


  if (!currentProduct || currentProduct.handle === routeHandle) return null;

  return (
    <div
      className={[
        "fixed",
        // Position: Higher on mobile to avoid Watch & Buy overlap, normal on desktop
        "bottom-[130px] md:bottom-8 right-2 md:right-8 z-[110]",
        "transition-transform duration-500 ease-in-out",
        open ? "translate-y-0 opacity-100" : "translate-y-[200%] opacity-0",
        "print:hidden",
        "w-[min(380px,96vw)]", // slightly smaller width
      ].join(" ")}
      style={{ pointerEvents: open ? "auto" : "none" }}
      aria-live="polite"
      role="status"
      onPointerEnter={markInteraction}
      onPointerDown={markInteraction}
      onFocus={markInteraction}
    >
      <Card className="border border-neutral-200 shadow-xl bg-white rounded-xl py-0! overflow-hidden">
        <CardContent className="p-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Thumbnail */}
            <div className="relative h-16 w-14 flex-shrink-0 rounded-md overflow-hidden bg-white border border-neutral-100">
              {currentProduct.imageUrl ? (
                <Image
                  src={currentProduct.imageUrl}
                  alt={currentProduct.imageAlt}
                  fill
                  className="select-none object-contain"
                  draggable={false}
                />
              ) : (
                <div className="h-full w-full bg-neutral-100" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="leading-none mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                <span className="text-neutral-500 text-[10px] md:text-[11px] uppercase tracking-wider font-semibold">just bought</span>
                <span className="mx-1 text-neutral-300">•</span>
                <span className="text-neutral-400 text-[10px] md:text-[11px]">{timeLabel}</span>
              </p>

              <p className="leading-tight mb-0.5">
                <span className="text-primary font-bold text-[15px] md:text-[16px]">
                  {person}
                </span>
              </p>

              <Link href={`/products/${currentProduct.handle}`}
                title={currentProduct.title}
                className="block text-[13px] md:text-[14px] font-medium leading-tight text-foreground line-clamp-1 hover:underline decoration-primary/30 underline-offset-2"
              >
                {currentProduct.title}
              </Link>
            </div>

            {/* Close Button */}
            <button
              onClick={handleDismiss}
              aria-label="Dismiss"
              className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 transition-colors flex-none"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
