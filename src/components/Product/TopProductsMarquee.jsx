'use client';
import Link from 'next/link';
import Image from 'next/image';
// src/components/TopProductsMarquee.jsx
import React, { useEffect, useMemo, useState } from "react";

import { shopify } from "@/lib/shopify";
import { GET_TOP_PRODUCTS } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";

// Same marquee primitives as your Available Banner
import {
  Marquee,
  MarqueeContent,
  MarqueeItem,
} from "@/components/ui/shadcn-io/marquee";

export default function TopProductsMarquee({
  handle = "top-products",
  // Kept for API compatibility; wire to your Marquee if supported
  speed = 35,
  gap = "1rem",
  pauseOnHover = true,
  bgClass = "bg-accent",
  fullBleed = true,
  className = "",
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const data = await shopify(GET_TOP_PRODUCTS, { handle });
        const nodes =
          (data?.collection?.products?.edges ?? [])
            .map((e) => e?.node)
            .filter(Boolean) || [];
        if (!cancelled) setItems(nodes);
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Failed to load products");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [handle]);

  if (err || (!loading && items.length === 0)) return null;

  // Build denser list so the marquee looks continuous
  const repeat = 2;
  const marqueeProducts = useMemo(() => {
    if (!items?.length) return [];
    return Array.from({ length: items.length * repeat }, (_, i) => items[i % items.length]);
  }, [items]);

  const containerClasses = `relative w-full overflow-hidden ${bgClass}`;

  const bleedStyle = fullBleed
    ? {
        position: "relative",
        left: "50%",
        width: "100vw",
        maxWidth: "100vw",
        transform: "translateX(-50%)",
      }
    : undefined;

  return (
    // Full-bleed container (escapes parent paddings): edge-to-edge
    <div
      className={`${containerClasses} ${className}`}
      role="region"
      aria-label="Top products marquee"
      style={{
        "--tp-gap": gap,
        "--tp-speed": `${speed}s`,
        ...(bleedStyle || {}),
      }}
    >
      <div className="w-full px-0 py-1">
        {loading ? (
          <div className="flex items-center gap-3 py-1 px-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-10 w-40 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <Marquee pauseOnHover={pauseOnHover}>
            <MarqueeContent>
              {marqueeProducts.map((p, idx) => (
                <MarqueeItem
                  key={`${p.id || p.handle}-${idx}`}
                  className="px-2 py-1"
                >
                  <ProductPill product={p} />
                </MarqueeItem>
              ))}
            </MarqueeContent>
          </Marquee>
        )}
      </div>
    </div>
  );
}

/* ---------- Badge chip (bigger image, tighter padding) ---------- */
function ProductPill({ product }) {
  const img = product?.images?.edges?.[0]?.node;
  const src = img?.url || "";
  const alt = img?.altText || product?.title || "Product";
  const title = product?.title || "Untitled";

  return (
    <Link href={`/products/${product.handle}`}
      className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
      aria-label={title}
    >
      <Badge
        variant="secondary"
        className="inline-flex h-12 items-center whitespace-nowrap gap-2 px-2 text-[14px] text-primary bg-accent"
      >
        {src ? (
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-white/90">
            <Image
              src={src}
              alt={alt}
              fill
              className="object-contain"
              draggable={false}
            />
          </span>
        ) : (
          <span className="inline-block h-9 w-9 shrink-0 rounded-[6px] bg-muted" />
        )}
        <span className="max-w-[260px] truncate text-primary cormorant-garamond-700 text-xl">{title}</span>
      </Badge>
    </Link>
  );
}
