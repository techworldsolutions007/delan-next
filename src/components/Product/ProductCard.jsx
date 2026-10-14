'use client';
import Link from 'next/link';
import React, { useCallback, useEffect, useState } from "react";

function shopifyImg(url, width = 600) {
  if (!url || !url.includes('cdn.shopify.com')) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}width=${width}&format=webp`;
}
import { Check, Heart, Loader2, ShoppingBag } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  readWishlistIds,
  writeWishlistIds,
  emitWishlistEvent,
  WISHLIST_STORAGE_KEY,
} from "@/lib/wishlistStore";

const BRAND = "#642c44";

export default function ProductCard({
  product,
  eager = false,
  onAddToCart,
  isAddBusy = false,
  justAdded = false,
  showWishlistButton = false,
  showPrice = true,
  showBottomAddToCartButton = false,
  showDesktopHoverQuickAdd = true,
}) {
  const [wishlisted, setWishlisted] = useState(false);
  const [isHoverDevice, setIsHoverDevice] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover)');
    setIsHoverDevice(mq.matches);
    const onChange = (e) => setIsHoverDevice(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const hasSecondImage = Boolean(product.secondImageUrl);
  const productId = product?.id ? String(product.id) : "";
  const hasAddToCartAction = typeof onAddToCart === "function";
  const hasDesktopQuickAdd =
    hasAddToCartAction && showDesktopHoverQuickAdd && !showBottomAddToCartButton;
  const hasBottomAddToCart = hasAddToCartAction && showBottomAddToCartButton;

  useEffect(() => {
    if (!showWishlistButton || !productId) {
      setWishlisted(false);
      return;
    }

    const syncWishlist = () => {
      const ids = readWishlistIds();
      setWishlisted(ids.includes(productId));
    };

    const onWishlistUpdated = () => syncWishlist();
    const onStorage = (event) => {
      if (event.key !== WISHLIST_STORAGE_KEY) return;
      syncWishlist();
    };

    syncWishlist();
    window.addEventListener("wishlist:updated", onWishlistUpdated);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("wishlist:updated", onWishlistUpdated);
      window.removeEventListener("storage", onStorage);
    };
  }, [productId, showWishlistButton]);

  const handleWishlistToggle = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!productId) return;

      const ids = readWishlistIds();
      const exists = ids.includes(productId);
      const next = exists ? ids.filter((id) => id !== productId) : [...ids, productId];

      writeWishlistIds(next);
      setWishlisted(!exists);
      emitWishlistEvent({
        ids: next,
        added: exists ? null : productId,
        removed: exists ? productId : null,
      });
    },
    [productId]
  );

  const handleQuickAdd = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!hasAddToCartAction || !product?.available || isAddBusy) return;
      onAddToCart(product);
    },
    [hasAddToCartAction, isAddBusy, onAddToCart, product]
  );

  const formatPrice = (amount) => {
    const num = Number.parseFloat(amount ?? 0);
    return Number.isFinite(num) ? `\u20B9${num.toFixed(0)}` : "\u20B90";
  };

  const desktopCtaLabel = !product?.available
    ? "Out of stock"
    : isAddBusy
      ? "Adding"
      : justAdded
        ? "Added"
        : product?.variantCount > 1
          ? "Select options"
          : "Add to cart";

  const inlineButtonLabel = !product?.available
    ? "Out of stock"
    : isAddBusy
      ? "Adding to cart"
      : justAdded
        ? "Added to cart"
        : product?.variantCount > 1
          ? "Select options"
          : "Add to cart";

  return (
    <div className="group/card relative">
      <Link href={`/products/${product.handle}`}
        aria-label={product.title}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2"
      >
        <div className="relative overflow-hidden">
          {showWishlistButton && (
            <button
              type="button"
              onClick={handleWishlistToggle}
              aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
              aria-pressed={wishlisted}
              className={`absolute bottom-2 right-2 z-30 inline-flex h-7 w-7 items-center justify-center rounded-full border border-black/10 bg-white/80 text-[#2d2d2d] shadow-[0_4px_12px_rgba(0,0,0,0.08)] backdrop-blur-[2px] transition-all duration-200 hover:scale-[1.04] hover:border-primary/20 hover:bg-white md:bottom-2.5 md:right-2.5 md:h-8 md:w-8 ${
                wishlisted
                  ? "md:opacity-100 md:pointer-events-auto"
                  : "md:pointer-events-none md:opacity-0 md:group-hover/card:pointer-events-auto md:group-hover/card:opacity-100 md:group-focus-within/card:pointer-events-auto md:group-focus-within/card:opacity-100"
              }`}
            >
              <Heart
                size={13}
                strokeWidth={1.8}
                style={wishlisted ? { color: BRAND, fill: BRAND } : { color: "#2d2d2d", fill: "none" }}
              />
            </button>
          )}

          <AspectRatio ratio={3 / 4} className="bg-[#f0eeec]">
            <div className="relative h-full w-full">
              <img
                src={shopifyImg(product.imageUrl, eager ? 800 : 350)}
                alt={product.altText}
                width={350}
                height={467}
                className={`absolute inset-0 h-full w-full object-cover select-none transition-all duration-500 ease-out ${
                  hasSecondImage
                    ? `group-hover/card:opacity-0 ${isHoverDevice ? 'group-hover/card:scale-[1.02]' : ''}`
                    : `${isHoverDevice ? 'group-hover/card:scale-[1.04]' : ''}`
                }`}
                draggable="false"
                loading={eager ? "eager" : "lazy"}
                decoding={eager ? "sync" : "async"}
                fetchPriority={eager ? "high" : "auto"}
              />

              {hasSecondImage && (
                <img
                  src={shopifyImg(product.secondImageUrl, 350)}
                  alt={product.secondAltText || product.altText}
                  width={350}
                  height={467}
                  className={`absolute inset-0 h-full w-full object-cover select-none opacity-0 transition-all duration-500 ease-out group-hover/card:opacity-100 ${isHoverDevice ? 'group-hover/card:scale-[1.02]' : ''}`}
                  draggable="false"
                  loading="lazy"
                  decoding="async"
                />
              )}

              {hasDesktopQuickAdd && (
                <div className="absolute inset-x-0 bottom-0 hidden px-3 pb-3 pr-12 md:block">
                  <div className="pointer-events-none translate-y-4 opacity-0 transition-all duration-300 ease-out group-hover/card:pointer-events-auto group-hover/card:translate-y-0 group-hover/card:opacity-100 group-focus-within/card:pointer-events-auto group-focus-within/card:translate-y-0 group-focus-within/card:opacity-100">
                    <button
                      type="button"
                      onClick={handleQuickAdd}
                      disabled={!product?.available || isAddBusy}
                      aria-live="polite"
                      aria-busy={isAddBusy}
                      aria-label={desktopCtaLabel}
                      title={justAdded ? "Added!" : desktopCtaLabel}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/70 bg-white/88 px-4 text-[11px] uppercase tracking-[0.15em] leading-snug text-[#2d2d2d] shadow-[0_14px_30px_rgba(0,0,0,0.16)] backdrop-blur-sm transition-all duration-200 hover:bg-white disabled:cursor-not-allowed disabled:opacity-75"
                    >
                      {isAddBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : justAdded ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <ShoppingBag className="h-4 w-4" />
                      )}
                      <span className="montserrat-600 leading-snug">{desktopCtaLabel}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </AspectRatio>
        </div>

        <div className="px-1 pb-2 pt-2">
          <h3
            className="truncate text-[11px] leading-snug text-[#2d2d2d] md:text-[12px] montserrat-500 tracking-[0.06em] uppercase"
            title={product.title}
          >
            {product.title}
          </h3>

          {showPrice && (
            <div className="flex items-center gap-2 mt-0.5">
              <p
                className="text-[11px] leading-snug md:text-[12px] montserrat-500 tracking-[0.04em]"
                style={{ color: BRAND }}
              >
                {formatPrice(product.price)}
              </p>
              {product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price) && (
                <p className="text-[10px] md:text-[11px] text-neutral-400 line-through montserrat-400">
                  {formatPrice(product.compareAtPrice)}
                </p>
              )}
            </div>
          )}

          {hasBottomAddToCart && (
            <button
  type="button"
  onClick={handleQuickAdd}
  disabled={!product?.available || isAddBusy}
  aria-live="polite"
  aria-busy={isAddBusy}
  aria-label={inlineButtonLabel}
  title={justAdded ? "Added!" : inlineButtonLabel}
  className="mt-3 flex h-11 w-full items-center justify-between rounded-[14px] border border-[#d9c5ce] bg-white px-3 text-[#2d2d2d] uppercase shadow-none transition-all duration-200 hover:border-primary/35 hover:bg-[#faf6f8] disabled:cursor-not-allowed disabled:opacity-65 gap-1.5 min-w-0"
>
  <span className="montserrat-600 text-[10px] tracking-[0.13em] leading-none whitespace-nowrap overflow-hidden text-ellipsis min-w-0 flex-1">
    {inlineButtonLabel}
  </span>
  {isAddBusy ? (
    <Loader2 className="h-[15px] w-[15px] shrink-0 animate-spin text-primary" />
  ) : justAdded ? (
    <Check className="h-[15px] w-[15px] shrink-0 text-primary" />
  ) : (
    <ShoppingBag className="h-[15px] w-[15px] shrink-0 text-primary" />
  )}
</button>
          )}
        </div>
      </Link>
    </div>
  );
}
