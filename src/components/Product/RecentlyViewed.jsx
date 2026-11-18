'use client';
import { usePathname, useParams } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { shopify } from "@/lib/shopify";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuickBuy } from "@/context/QuickBuyContext";
import ProductCard from "@/components/Product/ProductCard";

import { CART_CREATE, CART_LINES_ADD } from "@/lib/queries";
import { isPreorder } from "@/lib/preorder";
import {
  readRecentlyViewedHandles,
  rememberRecentlyViewedHandle,
} from "@/lib/recentlyViewedStore";
import { releaseFocusForCheckout } from "@/lib/checkout-helpers";
import { trackAddToCart } from "@/lib/analytics";

/** ──────────────────────────────────────────────────────────────────────────
 *  Config
 *  ────────────────────────────────────────────────────────────────────────── */
const BRAND = "#642c44";
const MAX_ITEMS = 5;
const CART_ID_KEY = "shopifyCartId";

/** A minimal cart fetch used as a fallback to get checkoutUrl when needed */
const CART_QUERY = /* GraphQL */ `
  query CartQuery($cartId: ID!) {
    cart(id: $cartId) {
      id
      checkoutUrl
    }
  }
`;

/** Storefront-safe, minimal product query for cards (no deprecated fields). */
export const GET_PRODUCT_CARD_BY_HANDLE = /* GraphQL */ `
  query getProductCardByHandle($handle: String!) {
    product(handle: $handle) {
      id
      title
      handle
      images(first: 2) {
        edges {
          node {
            url
            altText
          }
        }
      }
      priceRange {
        minVariantPrice { amount currencyCode }
      }
      variants(first: 50) {
        edges {
          node {
            id
            availableForSale
            price { amount currencyCode }
          }
        }
      }
      availableForSale
      collections(first: 5) { edges { node { handle title } } }
    }
  }
`;

/* ───────────────────────── GoKwik env helpers ───────────────────────── */
const normalizeGokwikEnv = (raw) => {
  const v = (raw || "").toLowerCase();
  if (["prod", "production", "live"].includes(v)) return "production";
  return "uat";
};

const GOKWIK_ENABLED = (process.env.NEXT_PUBLIC_ENABLE_GOKWIK || "false").toLowerCase() === "true";
const GOKWIK_MID = (process.env.NEXT_PUBLIC_GOKWIK_MERCHANT_ID || "").trim();
const GOKWIK_ENV = normalizeGokwikEnv(process.env.NEXT_PUBLIC_GOKWIK_ENV || "production");
const RAW_STORE_ID =
  (process.env.NEXT_PUBLIC_GOKWIK_STORE_ID || process.env.NEXT_PUBLIC_SHOPIFY_STORE_ID || "").trim();
const GOKWIK_STORE_ID =
  Number.isFinite(Number(RAW_STORE_ID)) && RAW_STORE_ID !== "" ? Number(RAW_STORE_ID) : undefined;
const GOKWIK_FB_PIXEL = (process.env.NEXT_PUBLIC_FB_PIXEL_IDS || "").trim() || undefined;


/** ──────────────────────────────────────────────────────────────────────────
 *  Small helpers
 *  ────────────────────────────────────────────────────────────────────────── */
function Stars({ value = 0 }) {
  const v = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
  return (
    <div className="h-5 leading-none text-[#f5a623] text-[15px]">
      {"★".repeat(v)}
      {"☆".repeat(5 - v)}
    </div>
  );
}

function Price({ amount, code }) {
  const num = Number.parseFloat(amount ?? 0);
  return (
    <p className="montserrat-500 text-[0.95rem] text-primary">
      Rs. {Number.isFinite(num) ? num.toFixed(0) : "0"}
    </p>
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

// Storage helpers now live in @/lib/recentlyViewedStore

/** ──────────────────────────────────────────────────────────────────────────
 *  Component
 *  ────────────────────────────────────────────────────────────────────────── */
export default function RecentlyViewed() {
  const { handle: routeHandle } = useParams();
  const pathname = usePathname();
  const isProductDetailRoute = !!pathname?.startsWith("/products/");
  const { openQuickBuy } = useQuickBuy();
  const [adding, setAdding] = useState({});
  const [buying, setBuying] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [productsRaw, setProductsRaw] = useState([]);

  // GoKwik SDK state (optional, for debugging)
  const [gokwikReady, setGokwikReady] = useState(false);

  /** 0) GoKwik: load SDK once and set merchantInfo */
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
      environment: GOKWIK_ENV, // "production" or "uat"
      type: "merchantInfo",
      ...(GOKWIK_STORE_ID ? { storeId: GOKWIK_STORE_ID } : {}),
      ...(GOKWIK_FB_PIXEL ? { fbPixel: GOKWIK_FB_PIXEL } : {}),
    };

    if (!document.getElementById("gokwik-sdk")) {
      const s = document.createElement("script");
      s.id = "gokwik-sdk";
      s.async = true;
      s.src = "https://pdp.gokwik.co/merchant-integration/build/merchant.integration.js?v4";
      s.onload = () => {
        try {
          if (window.gokwikSdk?.init) window.gokwikSdk.init();
        } catch { }
        setGokwikReady(Boolean(window.triggerGokwikCustomCheckout || window.gokwikSdk));

        // Helper to attach cart and then trigger modal
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
      setGokwikReady(Boolean(window.triggerGokwikCustomCheckout || window.gokwikSdk));
    }

  }, []);

  /** Helper to trigger GoKwik or fall back to Shopify checkout */
  const triggerGokwikOrFallback = useCallback(async (cartId, maybeCheckoutUrl) => {
    releaseFocusForCheckout();
    if (GOKWIK_ENABLED && GOKWIK_MID && typeof window.triggerGokwikCheckout === "function") {
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
  }, []);

  /** Track the current product handle (product page only) */
  useEffect(() => {
    if (!isProductDetailRoute || !routeHandle) return;
    rememberRecentlyViewedHandle(routeHandle);
  }, [isProductDetailRoute, routeHandle]);

  /** Fetch products by handles from localStorage */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // 1) read handles (MRU → unique → exclude current)
        const handles = readRecentlyViewedHandles();

        const seen = new Set();
        const filtered = [];
        for (const h of handles) {
          if (!h || h === routeHandle || seen.has(h)) continue;
          seen.add(h);
          filtered.push(h);
          if (filtered.length >= MAX_ITEMS) break;
        }

        if (filtered.length === 0) {
          if (!cancelled) setProductsRaw([]);
          return;
        }

        // 2) fetch in parallel (keep order)
        const results = await Promise.all(
          filtered.map(async (h) => {
            try {
              const d = await shopify(GET_PRODUCT_CARD_BY_HANDLE, { handle: h });
              return d?.product ?? null;
            } catch {
              return null;
            }
          })
        );

        if (!cancelled) setProductsRaw(results.filter(Boolean));
      } catch (e) {
        console.error(e);
        if (!cancelled) setError(e?.message || "Failed to load recently viewed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [routeHandle]);

  /** Normalize products to match the card structure */
  const products = useMemo(() => {
    return (productsRaw || []).map((node) => {
      // pick the first available variant; fall back to first variant
      const vEdges = node?.variants?.edges ?? [];
      const firstAvailableEdge = vEdges.find((e) => e?.node?.availableForSale);
      const fallbackEdge = vEdges[0];
      const chosenVariant = (firstAvailableEdge || fallbackEdge)?.node ?? null;

      // product-level availability = any variant available
      const anyAvailable = vEdges.some((e) => e?.node?.availableForSale);

      // images
      const imgs = node?.images?.edges ?? [];
      const img1 = imgs[0]?.node;
      const img2 = imgs[1]?.node;

      // price: prefer variant price (if present), else minVariantPrice
      const priceAmount =
        chosenVariant?.price?.amount ??
        node?.priceRange?.minVariantPrice?.amount ??
        "0";
      const currencyCode =
        chosenVariant?.price?.currencyCode ??
        node?.priceRange?.minVariantPrice?.currencyCode ??
        "INR";

      const img1Url = img1?.url || "https://via.placeholder.com/600x800";
      const img2Url = img2?.url && img2?.url !== img1?.url ? img2.url : null;

      return {
        id: node.id,
        title: node.title,
        handle: node.handle,
        price: priceAmount,
        currency: currencyCode,
        imageUrl: img1Url,
        altText: img1?.altText || node.title,
        secondImageUrl: img2Url,
        secondAltText: img2?.altText || img1?.altText || node.title,
        // rating is optional; default to 0 (you can wire a metafield later)
        ratingValue: 0,
        // IMPORTANT: use a variant that is actually available if possible
        variantId: chosenVariant?.id ?? null,
        available: anyAvailable,
        variantCount: node.variants?.edges?.length ?? 0,
        collections: node?.collections,
      };
    });
  }, [productsRaw]);

  const productsToShow = useMemo(() => products.slice(0, MAX_ITEMS), [products]);

  // Tri-state for add-to-cart: true (spinner), "added" (checkmark), false/undefined (idle)

  const ensureCartId = useCallback(async () => {
    let id = getStoredCartId();
    if (id) return id;
    const res = await shopify(CART_CREATE, { lines: [] });
    const errs = res?.cartCreate?.userErrors;
    if (errs?.length) throw new Error(errs.map((e) => e.message).join("; "));
    id = res?.cartCreate?.cart?.id;
    if (!id) throw new Error("Cart creation failed.");
    setStoredCartId(id);
    return id;
  }, []);

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

      if (!product?.variantId) {
        window.location.href = `/products/${product.handle}`;
        return;
      }
      setAdding((s) => ({ ...s, [product.id]: true }));
      try {
        const cartId = await ensureCartId();
        const res = await shopify(CART_LINES_ADD, {
          cartId,
          lines: [{ merchandiseId: product.variantId, quantity: 1 }],
        });
        const errs = res?.cartLinesAdd?.userErrors;
        if (errs?.length) throw new Error(errs.map((e) => e.message).join("; "));

        const cartData = res?.cartLinesAdd?.cart;
        const total = cartData?.totalQuantity ?? 0;
        try {
          window.dispatchEvent(
            new CustomEvent("cart:updated", { detail: { totalQuantity: total } })
          );
        } catch { }

        trackAddToCart({
          productGid: product.id,
          variantGid: product.variantId,
          productTitle: product.title,
          price: product.price ?? '0',
          cartId: cartData?.id ?? cartId ?? '',
          quantity: 1,
        });

        // success → show ✓ briefly
        setAdding((s) => ({ ...s, [product.id]: "added" }));
        setTimeout(() => {
          setAdding((s) => ({ ...s, [product.id]: false }));
        }, 1200);
      } catch (e) {
        alert(e?.message || "Could not add to cart.");
        setAdding((s) => ({ ...s, [product.id]: false }));
      }
    },
    [ensureCartId, openQuickBuy]
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

      if (!product?.variantId) {
        window.location.href = `/products/${product.handle}`;
        return;
      }
      setBuying((s) => ({ ...s, [product.id]: true }));
      try {
        let storedCartId = getStoredCartId();

        if (!storedCartId) {
          const res = await shopify(CART_CREATE, {
            lines: [{ merchandiseId: product.variantId, quantity: 1 }],
          });
          const errs = res?.cartCreate?.userErrors;
          if (errs?.length) throw new Error(errs.map((e) => e.message).join("; "));
          const newCart = res?.cartCreate?.cart;
          if (newCart?.id) setStoredCartId(newCart.id);
          await triggerGokwikOrFallback(newCart?.id, newCart?.checkoutUrl);
          return;
        }

        try {
          const res2 = await shopify(CART_LINES_ADD, {
            cartId: storedCartId,
            lines: [{ merchandiseId: product.variantId, quantity: 1 }],
          });
          const errs2 = res2?.cartLinesAdd?.userErrors;
          if (errs2?.length) throw new Error(errs2.map((e) => e.message).join("; "));
          const checkoutUrl = res2?.cartLinesAdd?.cart?.checkoutUrl;
          await triggerGokwikOrFallback(storedCartId, checkoutUrl);
          return;
        } catch (innerErr) {
          console.warn("BuyNow: stored cart failed, recreating cart:", innerErr);
          clearStoredCartId();
          const createAgain = await shopify(CART_CREATE, {
            lines: [{ merchandiseId: product.variantId, quantity: 1 }],
          });
          const errs3 = createAgain?.cartCreate?.userErrors;
          if (errs3?.length) throw new Error(errs3.map((e) => e.message).join("; "));
          const created = createAgain?.cartCreate?.cart;
          if (created?.id) setStoredCartId(created.id);
          await triggerGokwikOrFallback(created?.id, created?.checkoutUrl);
          return;
        }
      } catch (e) {
        console.error("Buy Now error:", e);
        alert(e?.message || "Could not proceed to checkout.");
      } finally {
        setBuying((s) => ({ ...s, [product.id]: false }));
      }
    },
    [triggerGokwikOrFallback, openQuickBuy]
  );

  /** Loading / Error / Empty states */
  if (loading) {
    return (
      <section id="recently-viewed-section" className="bg-white py-6 sm:py-10">
        <div className="mx-auto max-w-7xl px-[5%]">
          <h2 className="cormorant-garamond-700 text-primary text-3xl md:text-4xl lg:text-4xl mb-5 sm:mb-8 text-center">
            Recently Viewed
          </h2>
        </div>
        <div className="grid grid-cols-[repeat(5,220px)] lg:grid-cols-5 gap-3 sm:gap-4 overflow-x-auto px-[5%] pb-3 scroll-smooth">
          {Array.from({ length: MAX_ITEMS }).map((_, i) => (
            <div key={i} className="min-w-0">
              <Card className="border-0 shadow-none">
                <CardContent className="p-0">
                  <AspectRatio ratio={3 / 4} className="rounded-2xl bg-neutral-100">
                    <Skeleton className="h-full w-full rounded-2xl" />
                  </AspectRatio>
                  <div className="px-1 pt-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="recently-viewed-section" className="bg-white px-[5%] py-6 sm:py-12">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="cormorant-garamond-700 text-primary text-3xl md:text-4xl lg:text-4xl mb-3 sm:mb-4">
            Recently Viewed
          </h2>
          <p className="montserrat-500 text-[color:var(--brand-642, #642c44)]/80">
            Error loading products: {error}
          </p>
        </div>
      </section>
    );
  }

  if (productsToShow.length === 0) {
    return null;
  }

  return (
    <section id="recently-viewed-section" className="bg-white py-6 sm:py-10">
      <div className="mx-auto max-w-7xl px-[5%]">
        <h2 className="cormorant-garamond-700 uppercase text-primary text-3xl md:text-4xl lg:text-4xl mb-5 sm:mb-8 text-center">
          Recently Viewed
        </h2>
      </div>

      <div className="grid grid-cols-[repeat(5,220px)] lg:grid-cols-5 gap-3 sm:gap-4 overflow-x-auto px-[5%] pb-3 scroll-smooth">
        {productsToShow.map((product, index) => {
          const addState = adding[product.id];
          const isAddBusy = addState === true;
          const justAdded = addState === "added";

          return (
            <div key={product.id} className="min-w-0">
              <ProductCard
                product={product}
                eager={index < 2}
                onAddToCart={handleAddToCart}
                isAddBusy={isAddBusy}
                justAdded={justAdded}
                showWishlistButton={false}
                showBottomAddToCartButton={false}
                showDesktopHoverQuickAdd={false}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
