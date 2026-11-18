'use client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Heart, X, Trash2 } from "lucide-react";
import { shopify } from "@/lib/shopify";
import {
  readWishlistIds,
  writeWishlistIds,
  emitWishlistEvent,
  WISHLIST_STORAGE_KEY,
} from "@/lib/wishlistStore";

const GET_WISHLIST_PRODUCTS = /* GraphQL */ `
  query GetWishlistProducts($ids: [ID!]!) {
    nodes(ids: $ids) {
      __typename
      ... on Product {
        id
        title
        handle
        availableForSale
        featuredImage {
          url
          altText
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
`;

function formatMoney(amount, currencyCode = "INR") {
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value)) return null;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `₹${value}`;
  }
}

export default function WishlistSidebar({ open, onOpenChange }) {
  const router = useRouter();
  const [wishlistIds, setWishlistIds] = useState(() => readWishlistIds());
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Intercept mobile back button — close sidebar instead of navigating away
  const pushedStateRef = useRef(false);
  useEffect(() => {
    if (!open) return;

    window.history.pushState({ wishlistOpen: true }, "");
    pushedStateRef.current = true;

    const handlePopState = () => {
      pushedStateRef.current = false;
      onOpenChange?.(false);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (pushedStateRef.current) {
        pushedStateRef.current = false;
        window.history.back();
      }
    };
  }, [open, onOpenChange]);

  // Sync wishlist ids from storage and global events
  useEffect(() => {
    const sync = (detail) => {
      if (detail && Array.isArray(detail.ids)) {
        setWishlistIds(detail.ids);
      } else {
        setWishlistIds(readWishlistIds());
      }
    };
    const handleEvent = (e) => sync(e.detail);
    const handleStorage = (e) => {
      if (e.key === WISHLIST_STORAGE_KEY) sync({});
    };
    window.addEventListener("wishlist:updated", handleEvent);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("wishlist:updated", handleEvent);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Fetch products when sidebar opens or ids change
  useEffect(() => {
    if (!open) return;
    if (!wishlistIds.length) {
      setProducts([]);
      setError("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    (async () => {
      try {
        const data = await shopify(GET_WISHLIST_PRODUCTS, { ids: wishlistIds });
        const nodes = (data?.nodes || []).filter(
          (n) => n && n.__typename === "Product"
        );
        const map = new Map(nodes.map((n) => [String(n.id), n]));
        const ordered = wishlistIds.map((id) => map.get(String(id))).filter(Boolean);
        if (!cancelled) setProducts(ordered);
      } catch (err) {
        if (!cancelled) setError(err?.message || "Failed to load wishlist");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [open, wishlistIds]);

  const close = useCallback(() => onOpenChange?.(false), [onOpenChange]);

  const handleRemove = useCallback((productId) => {
    const id = String(productId || "");
    if (!id) return;
    setWishlistIds((prev) => {
      const next = prev.filter((x) => String(x) !== id);
      writeWishlistIds(next);
      emitWishlistEvent({ ids: next, removed: id });
      return next;
    });
    setProducts((prev) => prev.filter((p) => String(p.id) !== id));
  }, []);

  const handleGoProduct = useCallback((handle) => {
    close();
    router.push(`/products/${handle}`);
  }, [close, router]);

  const handleClearAll = useCallback(() => {
    writeWishlistIds([]);
    emitWishlistEvent({ ids: [] });
    setWishlistIds([]);
    setProducts([]);
  }, []);

  /* ── render helpers ── */
  const renderBody = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-2 gap-3 px-5 py-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border border-neutral-100">
              <div className="aspect-[3/4] bg-neutral-100 animate-pulse" />
              <div className="px-2.5 py-2.5 space-y-2">
                <div className="h-2.5 bg-neutral-100 animate-pulse rounded w-3/4" />
                <div className="h-2.5 bg-neutral-100 animate-pulse rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="px-5 py-5">
          <div className="flex items-center gap-3 border border-red-200 bg-red-50 p-3 text-red-700">
            <p className="text-sm flex-1">{error}</p>
          </div>
        </div>
      );
    }

    if (!products.length) {
      return (
        <div className="flex h-full flex-col items-center justify-center text-center px-8 pb-20">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100">
            <Heart className="h-[22px] w-[22px] text-neutral-400" strokeWidth={1.5} />
          </div>
          <p className="text-[13px] font-medium text-neutral-800">Your wishlist is empty</p>
          <p className="mt-1 text-[11px] text-neutral-400 leading-relaxed">Tap the heart icon on any product to save it here.</p>
        </div>
      );
    }

    return (
      <div className="px-5 py-5">
        <div className="grid grid-cols-2 gap-3">
          {products.map((product) => {
            const image = product?.featuredImage;
            const price = product?.priceRange?.minVariantPrice;
            const formatted = formatMoney(price?.amount, price?.currencyCode);

            return (
              <div
                key={product.id}
                className="group border border-neutral-100 hover:border-primary/30 transition-all overflow-hidden cursor-pointer"
                onClick={() => handleGoProduct(product.handle)}
              >
                <div className="relative aspect-[3/4] w-full bg-neutral-50 overflow-hidden">
                  {image?.url ? (
                    <Image
                      src={image.url}
                      alt={image.altText || product.title}
                      fill
                      sizes="(max-width: 520px) 44vw, 230px"
                      className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Heart className="h-6 w-6 text-neutral-200" />
                    </div>
                  )}

                  {!product.availableForSale && (
                    <div className="absolute inset-0 bg-white/60 flex items-end justify-center pb-2 pointer-events-none">
                      <span className="text-[9px] uppercase tracking-[0.12em] montserrat-600 text-neutral-500">
                        Sold Out
                      </span>
                    </div>
                  )}

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleRemove(product.id); }}
                    className="absolute top-2 right-2 h-6 w-6 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-sm opacity-0 group-hover:opacity-100 hover:bg-white transition-all"
                    aria-label={`Remove ${product.title} from wishlist`}
                  >
                    <X className="h-3 w-3 text-neutral-600" />
                  </button>
                </div>

                <div className="px-2.5 py-2.5">
                  <p className="text-[12px] montserrat-500 text-neutral-800 truncate leading-snug group-hover:text-primary transition-colors">
                    {product.title}
                  </p>
                  {formatted && (
                    <p className="text-[11px] montserrat-600 text-primary mt-0.5">{formatted}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[92vw] sm:w-[520px] p-0 flex flex-col overflow-hidden bg-white">

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 h-14 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <SheetTitle className="text-[15px] font-semibold tracking-wide text-neutral-900">
              My Wishlist
            </SheetTitle>
            {!loading && products.length > 0 && (
              <span className="inline-flex items-center justify-center h-[18px] min-w-[18px] rounded-full bg-primary/10 text-primary text-[10px] font-semibold px-1.5 tabular-nums leading-none">
                {products.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {products.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1 text-[10px] font-medium text-neutral-400 hover:text-primary transition-colors uppercase tracking-[0.1em]"
                aria-label="Clear all"
              >
                <Trash2 className="h-3 w-3" /> Clear all
              </button>
            )}
            <button
              type="button"
              onClick={close}
              className="flex items-center justify-center h-8 w-8 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
              aria-label="Close wishlist"
            >
              <X className="h-[15px] w-[15px]" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
          {renderBody()}
        </div>

      </SheetContent>
    </Sheet>
  );
}
