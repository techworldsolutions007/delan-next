'use client';
import Link from 'next/link';
import Image from 'next/image';
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { shopify } from "@/lib/shopify";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag, Loader2, Check } from "lucide-react";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

import { GET_OFFER_PRODUCTS, CART_CREATE, CART_LINES_ADD } from "@/lib/queries";

import { releaseFocusForCheckout } from "@/lib/checkout-helpers";
import { trackAddToCart } from "@/lib/analytics";
import { useQuickBuy } from "@/context/QuickBuyContext";
import { isPreorder } from "@/lib/preorder";

const BRAND = "#642c44";
const MAX_ITEMS = 12; // fetch more; carousel will show responsively
const CART_ID_KEY = "shopifyCartId";

/* ───────────────────────── GoKwik env helpers ───────────────────────── */
const normalizeGokwikEnv = (raw) => {
  const v = (raw || "").toLowerCase();
  if (["prod", "production", "live"].includes(v)) return "production";
  return "uat";
};

const GOKWIK_ENABLED =
  (process.env.NEXT_PUBLIC_ENABLE_GOKWIK || "false").toLowerCase() === "true";
const GOKWIK_MID = (process.env.NEXT_PUBLIC_GOKWIK_MERCHANT_ID || "").trim();
const GOKWIK_ENV = normalizeGokwikEnv(
  process.env.NEXT_PUBLIC_GOKWIK_ENV || "production"
);
const RAW_STORE_ID = (
  process.env.NEXT_PUBLIC_GOKWIK_STORE_ID ||
  process.env.NEXT_PUBLIC_SHOPIFY_STORE_ID ||
  ""
).trim();
const GOKWIK_STORE_ID =
  Number.isFinite(Number(RAW_STORE_ID)) && RAW_STORE_ID !== ""
    ? Number(RAW_STORE_ID)
    : undefined;
const GOKWIK_FB_PIXEL = (process.env.NEXT_PUBLIC_FB_PIXEL_IDS || "").trim() || undefined;

/* Small helpers */

// HELPER FUNCTION FOR SRCSET
function buildSrc(url, width) {
  if (!url) return "";

  const hasQuery = url.includes("?");
  const sep = hasQuery ? "&" : "?";

  return `${url}${sep}width=${width}&format=webp&quality=80`;
}

function buildSrcSet(url) {
  if (!url) return "";

  const sizes = [300, 500, 800, 1200];

  return sizes.map((w) => `${buildSrc(url, w)} ${w}w`).join(", ");
}

function formatINR(amount) {
  const num = Number.parseFloat(String(amount ?? 0));
  return Number.isFinite(num) ? num.toFixed(0) : "0";
}
function Stars({ value = 0 }) {
  const v = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
  return (
    <div className="h-5 leading-none text-[#f5a623] text-[15px]">
      {"★".repeat(v)}
      {"☆".repeat(5 - v)}
    </div>
  );
}

const getStoredCartId = () => {
  try {
    return localStorage.getItem(CART_ID_KEY) || null;
  } catch {
    return null;
  }
};
const setStoredCartId = (id) => {
  try {
    localStorage.setItem(CART_ID_KEY, id);
  } catch { }
};
const clearStoredCartId = () => {
  try {
    localStorage.removeItem(CART_ID_KEY);
  } catch { }
};

// Validate cart existence
const CART_QUERY = /* GraphQL */ `
  query CartQuery($cartId: ID!) {
    cart(id: $cartId) {
      id
      totalQuantity
      checkoutUrl
    }
  }
`;

export default function OfferSection() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const { openQuickBuy } = useQuickBuy();

  // Optional: keep a flag for debugging/metrics
  const [gokwikReady, setGokwikReady] = useState(false);

  /* ------------------------ GoKwik: init SDK once ------------------------ */
  useEffect(() => {
    if (!GOKWIK_ENABLED || !GOKWIK_MID) {
      setGokwikReady(false);
      return;
    }

    // Define merchantInfo BEFORE loading SDK. Include both keys (mid & merchantId).
    window.merchantInfo = {
      ...(window.merchantInfo || {}),
      mid: GOKWIK_MID,
      merchantId: GOKWIK_MID,
      environment: GOKWIK_ENV, // "production" | "uat"
      type: "merchantInfo",
      ...(GOKWIK_STORE_ID ? { storeId: GOKWIK_STORE_ID } : {}),
      ...(GOKWIK_FB_PIXEL ? { fbPixel: GOKWIK_FB_PIXEL } : {}),
    };

    if (!document.getElementById("gokwik-sdk")) {
      const s = document.createElement("script");
      s.id = "gokwik-sdk";
      s.async = true;
      s.src =
        "https://pdp.gokwik.co/merchant-integration/build/merchant.integration.js?v4";
      s.onload = () => {
        try {
          if (window.gokwikSdk?.init) window.gokwikSdk.init();
        } catch { }
        setGokwikReady(
          Boolean(window.triggerGokwikCustomCheckout || window.gokwikSdk)
        );

        // attach helper to window (cart-aware custom checkout)
        window.triggerGokwikCheckout = function triggerGokwikCheckout(cartId) {
          window.merchantInfo = {
            ...(window.merchantInfo || {}),
            mid: GOKWIK_MID,
            merchantId: GOKWIK_MID,
            environment: GOKWIK_ENV,
            type: "merchantInfo",
            ...(GOKWIK_STORE_ID ? { storeId: GOKWIK_STORE_ID } : {}),
            ...(GOKWIK_FB_PIXEL ? { fbPixel: GOKWIK_FB_PIXEL } : {}),
            cart: { id: cartId },
          };
          if (typeof window.triggerGokwikCustomCheckout === "function") {
            window.triggerGokwikCustomCheckout();
          }
        };
      };
      s.onerror = () => {
        setGokwikReady(false);
      };
      document.body.appendChild(s);
    } else {
      setGokwikReady(
        Boolean(window.triggerGokwikCustomCheckout || window.gokwikSdk)
      );
    }
  }, []);

  /* Prefer GoKwik checkout; fallback to Shopify checkout */
  const triggerGokwikOrFallback = useCallback(
    async (cartId, maybeCheckoutUrl) => {
      releaseFocusForCheckout();
      if (
        GOKWIK_ENABLED &&
        GOKWIK_MID &&
        typeof window.triggerGokwikCheckout === "function"
      ) {
        try {
          window.triggerGokwikCheckout(cartId);
          return;
        } catch {
          // fall through to native checkout
        }
      }

      // Fallback to native Shopify checkout
      if (maybeCheckoutUrl) {
        window.open(maybeCheckoutUrl, "_blank", "noopener,noreferrer");
        return;
      }
      try {
        const data = await shopify(CART_QUERY, { cartId });
        const url = data?.cart?.checkoutUrl;
        window.open(url || "/cart", "_blank", "noopener,noreferrer");
      } catch {
        window.open("/cart", "_blank", "noopener,noreferrer");
      }
    },
    []
  );

  /* -------------------------- Data: Offer products -------------------------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const d = await shopify(GET_OFFER_PRODUCTS, { first: 48 });
        if (!cancelled) setData(d);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError(e?.message || "Failed to load offers");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const discountedProducts = useMemo(() => {
    const edges = data?.products?.edges ?? [];
    return edges
      .map(({ node }) => {
        const img1 = node.images?.edges?.[0]?.node;
        const img2 = node.images?.edges?.[1]?.node;
        const variants = node.variants?.edges?.map((e) => e.node) ?? [];

        // parse rating
        let ratingValue = 0;
        if (node.rating?.value) {
          try {
            const parsed = JSON.parse(node.rating.value);
            ratingValue = Number.parseFloat(parsed?.value ?? 0) || 0;
          } catch { }
        }

        // Find best discount among variants
        let best = null;
        let anyAvailable = false;
        let firstAvailableVariantId = null;

        for (const v of variants) {
          if (v.availableForSale) {
            anyAvailable = true;
            if (!firstAvailableVariantId) firstAvailableVariantId = v.id;
          }
          const price = Number.parseFloat(v?.price?.amount ?? "0");
          const compare = Number.parseFloat(v?.compareAtPrice?.amount ?? "0");
          if (compare > price && price > 0) {
            const pct = Math.round(((compare - price) / compare) * 100);
            if (!best || pct > best.discountPct) {
              best = {
                variantId: v.id,
                available: !!v.availableForSale,
                price,
                compare,
                currency: v?.price?.currencyCode,
                discountPct: pct,
              };
            }
          }
        }
        if (!best) return null;

        // If best discount variant is OOS, but others are available, pick first available for Buy Now
        const finalVariantId = best.available ? best.variantId : (firstAvailableVariantId || best.variantId);

        return {
          id: node.id,
          title: node.title,
          handle: node.handle,
          imageUrl: img1?.url ?? "https://via.placeholder.com/600x800",
          altText: img1?.altText || node.title,
          secondImageUrl:
            img2?.url && img2?.url !== img1?.url ? img2.url : null,
          secondAltText: img2?.altText || img1?.altText || node.title,
          ratingValue,
          ...best,
          variantId: finalVariantId,
          available: anyAvailable,
          variantCount: variants.length,
        };
      })
      .filter(Boolean)
      .slice(0, MAX_ITEMS);
  }, [data]);

  /* ── Separate busy states ───────────────────────────────────────────── */
  const [addBusy, setAddBusy] = useState({}); // { [productId]: boolean | "added" }
  const [buyBusy, setBuyBusy] = useState({}); // { [productId]: boolean }

  /**
   * Create a new empty cart (or with lines) and store ID.
   */
  const createCart = useCallback(async (lines = []) => {
    const res = await shopify(CART_CREATE, { lines });
    const errs = res?.cartCreate?.userErrors;
    if (errs?.length) throw new Error(errs.map((e) => e.message).join("; "));
    const cart = res?.cartCreate?.cart;
    if (!cart?.id) throw new Error("Cart creation failed.");
    setStoredCartId(cart.id);
    return cart; // { id, checkoutUrl, totalQuantity? }
  }, []);

  /**
   * Validate stored cart. If missing/invalid, create a fresh one.
   */
  const ensureCartId = useCallback(async () => {
    let id = getStoredCartId();
    if (id) {
      try {
        const check = await shopify(CART_QUERY, { cartId: id });
        if (check?.cart?.id) return id; // valid
        clearStoredCartId();
      } catch {
        clearStoredCartId();
      }
    }
    const fresh = await createCart([]);
    return fresh.id;
  }, [createCart]);

  /**
   * Add one line to a cart, with a retry on "cart does not exist".
   * Returns the resulting cart object (may include checkoutUrl).
   */
  const addLineWithRetry = useCallback(
    async (variantId) => {
      let cartId = await ensureCartId();

      const tryAdd = async (cid) => {
        const res = await shopify(CART_LINES_ADD, {
          cartId: cid,
          lines: [{ merchandiseId: variantId, quantity: 1 }],
        });
        const errs = res?.cartLinesAdd?.userErrors;
        if (errs?.length) {
          const msg = errs.map((e) => e.message).join("; ");
          throw new Error(msg || "Unable to add to cart.");
        }
        return res?.cartLinesAdd?.cart; // { id, totalQuantity, checkoutUrl? }
      };

      try {
        const cart = await tryAdd(cartId);
        return cart;
      } catch (err) {
        const msg = (err?.message || "").toLowerCase();
        const looksGone =
          msg.includes("specified cart does not exist") ||
          msg.includes("cart does not exist") ||
          msg.includes("not found") ||
          msg.includes("could not find");
        if (!looksGone) throw err;

        // Retry with a brand-new cart that already contains the intended line
        clearStoredCartId();
        const fresh = await createCart([
          { merchandiseId: variantId, quantity: 1 },
        ]);
        return fresh;
      }
    },
    [ensureCartId, createCart]
  );

    const handleAddToCart = useCallback(
    async (product) => {
      // If multiple variants, open Quick Buy
      if (product.variantCount > 1) {
        openQuickBuy({
          handle: product.handle,
          title: product.title,
          price: product.price,
          imageUrl: product.imageUrl,
        });
        return;
      }

      setAddBusy((b) => ({ ...b, [product.id]: true }));
      try {
        if (!product.variantId) {
          window.location.href = `/products/${product.handle}`;
          return;
        }

        const cart = await addLineWithRetry(product.variantId);

        // mark as "added" briefly
        setAddBusy((b) => ({ ...b, [product.id]: "added" }));
        setTimeout(() => {
          setAddBusy((b) => ({ ...b, [product.id]: false }));
        }, 1200);

        trackAddToCart({
          productGid: product.id,
          variantGid: product.variantId,
          productTitle: product.title,
          price: product.price ?? '0',
          cartId: cart?.id ?? '',
          quantity: 1,
        });

        const total = cart?.totalQuantity ?? 0;
        try {
          window.dispatchEvent(
            new CustomEvent("cart:updated", {
              detail: { totalQuantity: total },
            })
          );
          // Trigger cart sidebar to open
          window.dispatchEvent(new CustomEvent("cart:item-added"));
        } catch { }
      } catch (e) {
        console.error(e);
        setAddBusy((b) => ({ ...b, [product.id]: false }));
        alert(`Could not add to cart: ${e?.message || e}`);
      }
    },
    [addLineWithRetry, openQuickBuy]
  );

    const handleBuyNow = useCallback(
    async (product) => {
      // If multiple variants, open Quick Buy
      if (product.variantCount > 1) {
        openQuickBuy({
          handle: product.handle,
          title: product.title,
          price: product.price,
          imageUrl: product.imageUrl,
        });
        return;
      }

      setBuyBusy((b) => ({ ...b, [product.id]: true }));
      try {
        if (!product.variantId) {
          window.location.href = `/products/${product.handle}`;
          return;
        }

        // Add line (with resilient cart handling)
        const cart = await addLineWithRetry(product.variantId);

        // Determine the cart id to trigger checkout for
        let cid = getStoredCartId();
        if (!cid && cart?.id) cid = cart.id;

        // Prefer GoKwik; fallback to Shopify checkout
        await triggerGokwikOrFallback(cid, cart?.checkoutUrl);
      } catch (e) {
        console.error("Buy Now error:", e);
        alert(e?.message || "Could not proceed to checkout.");
      } finally {
        setBuyBusy((b) => ({ ...b, [product.id]: false }));
      }
    },
    [addLineWithRetry, triggerGokwikOrFallback, openQuickBuy]
  );

  /* Loading / Error states */
  if (loading) {
    return (
      <section
        id="offers-section"
        className="bg-white px-[5%] pt-10 pb-5 text-center"
      >
        <h2 className="text-center cormorant-garamond-700 uppercase text-primary text-3xl md:text-4xl lg:text-4xl mb-2">
          Offers & Sale
        </h2>
        <Skeleton className="h-6 w-48 mx-auto mb-6" />
        <Carousel className="relative">
          <CarouselContent>
            {Array.from({ length: 4 }).map((_, i) => (
              <CarouselItem
                key={i}
                className="basis-full sm:basis-1/2 xl:basis-1/4"
              >
                <Card className="border-0 shadow-none">
                  <CardContent className="p-0">
                    <AspectRatio
                      ratio={3 / 4}
                      className="rounded-2xl bg-neutral-100"
                    >
                      <Skeleton className="h-full w-full rounded-2xl" />
                    </AspectRatio>
                    <div className="px-1 pt-3 space-y-2 text-left">
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-10 w-36" />
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-[-14px] h-10 w-10 rounded-full border-black/35 text-black/60 hover:bg-[color:var(--brand-642, #642c44)] hover:text-white hover:border-[color:var(--brand-642, #642c44)]" />
          <CarouselNext className="right-[-14px] h-10 w-10 rounded-full border-black/35 text-black/60 hover:bg-[color:var(--brand-642, #642c44)] hover:text-white hover:border-[color:var(--brand-642, #642c44)]" />
        </Carousel>
      </section>
    );
  }

  if (error) {
    return (
      <section
        id="offers-section"
        className="bg-white px-[5%] py-4 text-center"
      >
        <h2 className="text-center cormorant-garamond-700 uppercase text-primary text-3xl md:text-4xl lg:text-4xl mb-2">
          Offers & Sale
        </h2>
        <p className="montserrat-600 text-[#642c44]/80">
          Error loading offers: {error}
        </p>
      </section>
    );
  }

  if (!discountedProducts.length) {
    return (
      <section
        id="offers-section"
        className="bg-white px-[5%] py-4 text-center"
      >
        <h2 className="text-center cormorant-garamond-700 uppercase text-primary text-3xl md:text-4xl lg:text-4xl mb-2">
          Offers & Sale
        </h2>
        <p className="montserrat-600 text-[#642c44]/80">
          No discounted items found right now.
        </p>
      </section>
    );
  }

  return (
    <section id="offers-section" className="bg-white px-[5%] py-12 text-center">
      <h2 className="text-center cormorant-garamond-700 uppercase text-primary text-3xl md:text-4xl lg:text-4xl mb-2">
        Offers & Sale
      </h2>

      <Carousel opts={{ align: "start", loop: false }} className="relative">
        <CarouselContent>
          {discountedProducts.map((product, index) => {
            const addState = addBusy[product.id];
            const isAddBusy = addState === true;
            const justAdded = addState === "added";
            const isBuyBusy = !!buyBusy[product.id];

            // srcset
            const isFirst = index === 0;

            return (
              <CarouselItem
                key={product.id}
                className="basis-full sm:basis-1/2 xl:basis-1/4"
              >
                <Card className="border-0 shadow-none text-left group h-full">
                  <Link href={`/products/${product.handle}`}
                    aria-label={product.title}
                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 h-full"
                    style={{ "--tw-ring-color": BRAND }}
                  >
                    <CardContent className="p-0 h-full flex flex-col montserrat-500">
                      {/* Image + Sale badge */}
                      <div className="relative">
                        <AspectRatio
                          ratio={3 / 4}
                          className="rounded-2xl overflow-hidden bg-rose-50"
                        >
                          <div className="relative h-full w-full transition-transform duration-300">
                            {/* <img
                              src={product.imageUrl}
                              alt={product.altText}
                              className="absolute inset-0 h-full w-full object-cover select-none transition-opacity duration-300 group-hover:opacity-0"
                              draggable="false"
                              loading="lazy"
                              decoding="async"
                            /> */}

                            {/* Primary image */}
                            <Image
                              src={product.imageUrl}
                              alt={product.altText}
                              fill
                              sizes="(max-width: 480px) 300px, (max-width: 768px) 500px, (max-width: 1280px) 800px, 1200px"
                              className="object-cover select-none transition-opacity duration-300 group-hover:opacity-0"
                              draggable="false"
                              priority={isFirst}
                            />

                            {/* Hover image */}
                            {product.secondImageUrl && (
                              <Image
                                src={product.secondImageUrl}
                                alt={product.secondAltText}
                                fill
                                sizes="(max-width: 480px) 300px, (max-width: 768px) 500px, (max-width: 1280px) 800px, 1200px"
                                className="object-cover select-none opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                                draggable="false"
                              />
                            )}

                            <div className="absolute left-3 top-3 rounded-full bg-[#642c44] text-white px-3 py-1 text-xs font-bold shadow-md">
                              -{product.discountPct}% OFF
                            </div>

                          </div>
                        </AspectRatio>
                      </div>

                      {/* Details */}
                      <div className="px-1 pt-3 flex flex-col items-center gap-1.5">
                        <h3
                          className="montserrat-600 text-[1.1rem] font-semibold text-[color:var(--brand-642, #642c44)] leading-[1.35] truncate text-center w-full"
                          style={{ height: "calc(1em * 1.35)" }}
                          title={product.title}
                        >
                          {product.title}
                        </h3>

                        <div className="flex items-baseline gap-2">
                          <span className="montserrat-500 text-[0.95rem] text-[#642c44] font-semibold">
                            ₹{formatINR(product.price)}
                          </span>
                          <span className="montserrat-500 text-sm text-neutral-500 line-through">
                            ₹{formatINR(product.compare)}
                          </span>
                        </div>

                        <Stars value={product.ratingValue} />

                        {/* Buttons (Buy Now + Add to Cart) */}
                        <div className="w-full mt-1.5 flex justify-center items-center gap-2 pb-3">
                          {/* Buy Now is independent of Add-to-cart state */}
                          <Button
                            className="montserrat-600 uppercase border-2 h-10 flex-1 max-w-[160px] sm:max-w-none sm:w-48 px-3 leading-none"
                            style={{
                              backgroundColor: BRAND,
                              borderColor: BRAND,
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (!product.available || isBuyBusy) return;
                              handleBuyNow(product);
                            }}
                            disabled={!product.available || isBuyBusy}
                          >
                            {isBuyBusy
                              ? "Buying..."
                              : product.available
                                ? "Buy Now"
                                : "Out of stock"}
                          </Button>

                          {/* Add to Cart: spinner while loading, check on success */}
                          <Button
                            className="montserrat-600 font-semibold border-2 h-10 flex items-center justify-center w-10 sm:w-10"
                            style={{
                              backgroundColor: BRAND,
                              borderColor: BRAND,
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (!product.available || isAddBusy) return;
                              handleAddToCart(product);
                            }}
                            disabled={!product.available || isAddBusy}
                            aria-live="polite"
                            aria-busy={isAddBusy}
                            aria-label={
                              isAddBusy
                                ? "Adding to cart"
                                : justAdded
                                  ? "Added"
                                  : "Add to cart"
                            }
                            title={justAdded ? "Added!" : "Add to cart"}
                          >
                            {isAddBusy ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : justAdded ? (
                              <Check className="w-5 h-5" />
                            ) : (
                              <ShoppingBag className="w-5 h-5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              </CarouselItem>
            );
          })}
        </CarouselContent>

        {
          discountedProducts.length > 1 && (
            <>
              <CarouselPrevious className="left-[-10px] md:left-[-50px] top-60 md:top-75 h-10 w-10 rounded-full bg-primary! text-white! border-none" />
              <CarouselNext className="right-[-10px] md:right-[-50px] top-60 md:top-75 h-10 w-10 rounded-full bg-primary! text-white! border-none" />
            </>
          )
        }
      </Carousel >
    </section >
  );
}











