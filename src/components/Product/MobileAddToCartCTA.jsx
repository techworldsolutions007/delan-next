'use client';
// src/components/MobileAddToCartCTA.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";

/**
 * MobileAddToCartCTA
 *
 * - Mobile-only sticky bottom "pop-up" CTA (fixed footer)
 * - Uses shadcn Button + Tailwind
 * - All CTA logic/state lives here
 * - Exposes a render-prop to pass `onCtaChange` into ProductHeader
 *
 * Usage:
 * <MobileAddToCartCTA>
 *   {(onCtaChange) => (
 *     <ProductHeader onCtaChange={onCtaChange} />
 *   )}
 * </MobileAddToCartCTA>
 */
const MobileAddToCartCTA = ({ children }) => {
  // Track if we're on mobile/tablet (<= 1023px) to render CTA
  const [isSmallViewport, setIsSmallViewport] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 1023px)").matches
      : true
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 1023px)");
    const onChange = (e) => setIsSmallViewport(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // CTA payload coming from ProductHeader.onCtaChange
  const [cta, setCta] = useState({
    title: "",
    priceLabel: "",
    imageUrl: "",
    inStock: false,
    adding: false,
    buying: false,
    onAdd: null, // () => Promise|void
    onBuyNow: null, // () => Promise|void
  });

  // Stable updater passed down to ProductHeader
  const onCtaChange = useCallback((next) => {
    setCta((prev) => ({
      ...prev,
      ...next,
      // always ensure callables to prevent crashes
      onAdd: typeof next?.onAdd === "function" ? next.onAdd : prev.onAdd,
      onBuyNow: typeof next?.onBuyNow === "function" ? next.onBuyNow : prev.onBuyNow,
    }));
  }, []);

  // Safety: don't render CTA until we have something meaningful
  const ready = useMemo(
    () => Boolean(cta?.title) && Boolean(cta?.priceLabel),
    [cta?.title, cta?.priceLabel]
  );

  // Button click handlers (guarded)
  const onClickAdd = useCallback(async () => {
    try {
      if (typeof cta.onAdd === "function") {
        await cta.onAdd();
      }
    } catch (e) { }
  }, [cta.onAdd]);

  const onClickBuyNow = useCallback(async () => {
    try {
      if (typeof cta.onBuyNow === "function") {
        await cta.onBuyNow();
      }
    } catch (e) { }
  }, [cta.onBuyNow]);

  return (
    <>
      {/* Children can be a render prop that receives onCtaChange */}
      {typeof children === "function" ? children(onCtaChange) : children}

      {/* Fixed mobile footer CTA */}
      {isSmallViewport && ready && (
        <div
          id="mobile-cta-footer"
          className="lg:hidden fixed inset-x-0 bottom-0 z-50 border-t bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75 shadow-[0_-10px_30px_rgba(0,0,0,0.08)]"
        >
          <div className="mx-auto max-w-7xl px-3">
            <div className="flex items-center gap-2 py-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
              {/* Thumbnail */}
              {cta.imageUrl ? (
                <div className="h-12 w-12 rounded-lg overflow-hidden border bg-white flex-none">
                  <img
                    src={cta.imageUrl}
                    alt={cta.title}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                </div>
              ) : (
                <div className="h-12 w-12 rounded-lg overflow-hidden border bg-muted flex-none" />
              )}

              {/* Title + Price */}
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold leading-tight line-clamp-1">
                  {cta.title}
                </div>
                <div className="text-xs text-muted-foreground leading-tight line-clamp-1">
                  {cta.priceLabel}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-none">
                <Button
                  onClick={onClickAdd}
                  disabled={!cta.inStock || cta.adding || cta.buying}
                  variant="outline"
                  className="h-11 px-3 rounded-xl border-primary text-primary font-bold hover:bg-primary/5 active:scale-95 transition-all"
                  style={{ borderColor: "var(--brand-642, #642c44)", color: "var(--brand-642, #642c44)" }}
                >
                  {cta.adding ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                  ) : (
                    <ShoppingCart className="w-5 h-5" strokeWidth={2.5} />
                  )}
                </Button>

                <Button
                  onClick={onClickBuyNow}
                  disabled={!cta.inStock || cta.adding || cta.buying}
                  className="h-11 min-w-[120px] rounded-xl bg-primary px-6 font-bold text-white hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95"
                  style={{ backgroundColor: "var(--brand-642, #642c44)" }}
                >
                  <span className="text-sm tracking-wide">
                    {cta.inStock ? (cta.buying ? "PROCEEDING..." : "BUY NOW") : "SOLD OUT"}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileAddToCartCTA;
