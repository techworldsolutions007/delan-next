'use client';
import Link from 'next/link';
import React, { useCallback, useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

const formatMoney = (amount, currencyCode = "INR") => {
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value)) return currencyCode;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(value);
};

export default function WishlistSidebar({ open, onOpenChange }) {
  const [wishlistIds, setWishlistIds] = useState(() => readWishlistIds());
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Keep wishlist ids in sync with storage + global events
  useEffect(() => {
    const sync = (detail) => {
      if (detail && Array.isArray(detail.ids)) {
        setWishlistIds(detail.ids);
      } else {
        setWishlistIds(readWishlistIds());
      }
    };
    const handleWishlistEvent = (event) => sync(event.detail);
    const handleStorage = (event) => {
      if (event.key === WISHLIST_STORAGE_KEY) sync();
    };
    window.addEventListener("wishlist:updated", handleWishlistEvent);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("wishlist:updated", handleWishlistEvent);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Fetch product details whenever sidebar opens or ids change
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
          (node) => node && node.__typename === "Product"
        );
        const map = new Map(nodes.map((node) => [String(node.id), node]));
        const ordered = wishlistIds
          .map((id) => map.get(String(id)))
          .filter(Boolean);
        if (!cancelled) setProducts(ordered);
      } catch (err) {
        if (!cancelled) setError(err?.message || "Failed to load wishlist");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, wishlistIds]);

  const handleRemove = useCallback((productId) => {
    const normalized = String(productId || "");
    if (!normalized) return;
    setWishlistIds((prev) => {
      const next = prev.filter((id) => String(id) !== normalized);
      writeWishlistIds(next);
      emitWishlistEvent({ ids: next, removed: normalized });
      return next;
    });
  }, []);

  const handleCloseAndNavigate = useCallback(() => {
    onOpenChange?.(false);
  }, [onOpenChange]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="flex gap-3">
              <Skeleton className="h-20 w-20 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <p className="text-sm text-destructive">
          {error}
        </p>
      );
    }

    if (!products.length) {
      return (
        <div className="text-center text-sm text-muted-foreground py-10">
          No favorites yet. Tap the heart icon on any product to save it.
        </div>
      );
    }

    return (
      <div className="space-y-4]">
        {products.map((product) => {
          const image = product?.featuredImage;
          const price = product?.priceRange?.minVariantPrice;
          return (
            <div
              key={product.id}
              className="flex gap-3 rounded-xl border border-neutral-200/70 p-3"
            >
              <Link href={`/products/${product.handle}`}
                className="block h-auto w-20 overflow-hidden rounded-lg border border-neutral-100"
                onClick={handleCloseAndNavigate}
              >
                {image?.url ? (
                  <img
                    src={image.url}
                    alt={image.altText || product.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-muted text-xs text-muted-foreground">
                    No image
                  </div>
                )}
              </Link>
              <div className="flex flex-1 flex-col">
                <Link href={`/products/${product.handle}`}
                  className="font-semibold text-sm text-primary hover:underline"
                  onClick={handleCloseAndNavigate}
                >
                  {product.title}
                </Link>
                {price ? (
                  <p className="text-sm text-neutral-600 mt-1">
                    {formatMoney(price.amount, price.currencyCode)}
                  </p>
                ) : null}
                <div className="mt-auto flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemove(product.id)}
                    className="flex-1"
                  >
                    Remove
                  </Button>
                  <Button
                    size="sm"
                    asChild
                    className="flex-1"
                  >
                    <Link href={`/products/${product.handle}`}
                      onClick={handleCloseAndNavigate}
                    >
                      View
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md z-[120]">
        <SheetHeader className="text-left">
          <SheetTitle>My Favorites</SheetTitle>
          <SheetDescription>Products you’ve hearted recently</SheetDescription>
        </SheetHeader>
        <div className="mt-6 h-full overflow-y-auto pr-2">
          {renderContent()}
        </div>
      </SheetContent>
    </Sheet>
  );
}
