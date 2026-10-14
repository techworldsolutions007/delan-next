'use client';
import Link from 'next/link';
// TopProducts.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { shopify } from "@/lib/shopify";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GET_TOP_PRODUCTS,
  GET_COLLECTIONS,
  CART_CREATE,
  CART_LINES_ADD,
} from "@/lib/queries";
import { releaseFocusForCheckout } from "@/lib/checkout-helpers";
import { trackAddToCart } from "@/lib/analytics";
import { useQuickBuy } from "@/context/QuickBuyContext";
import SectionHeader from "@/components/ui/SectionHeader";
import ProductCard from "@/components/Product/ProductCard";

const CART_ID_KEY = "shopifyCartId";
const DEFAULT_SUBTITLE = "Every piece is a starting point. Style it yours.";

// NOTE: we need a small cart fetch to read checkoutUrl if lines-add doesn't return it
const CART_QUERY = /* GraphQL */ `
  query CartQuery($cartId: ID!) {
    cart(id: $cartId) {
      id
      checkoutUrl
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

/**
 * TopProducts can render:
 * - mode="products": products for a collection handle (default)
 * - mode="collections": a grid of collections
 */
export default function TopProducts({
  mode = "products",
  handle = "top-products",
  title = "Shop By Category",
  subtitle = DEFAULT_SUBTITLE,
  showHeaderLink = true,
  collectionsFirst = 12,
  productsFirst = 20,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const [gokwikReady, setGokwikReady] = useState(false);
  const { openQuickBuy } = useQuickBuy();

  /* ------------------------ GoKwik: init SDK once ------------------------ */
  useEffect(() => {
    if (!GOKWIK_ENABLED || !GOKWIK_MID) {
      setGokwikReady(false);
      return;
    }

    window.merchantInfo = {
      ...(window.merchantInfo || {}),
      mid: GOKWIK_MID,
      merchantId: GOKWIK_MID,
      environment: GOKWIK_ENV,
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

  /* Prefer GoKwik checkout; fallback to Shopify checkout */
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        let d;
        if (mode === "collections") {
          d = await shopify(GET_COLLECTIONS, { first: collectionsFirst });
        } else {
          d = await shopify(GET_TOP_PRODUCTS, { handle, first: productsFirst });
        }

        if (!cancelled) setData(d);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError(e?.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, handle, collectionsFirst, productsFirst]);

  /* ================== RENDER COLLECTIONS MODE ================== */
  if (mode === "collections") {
    const collections = (data?.collections?.edges ?? []).map(({ node }) => ({
      id: node.id,
      handle: node.handle,
      title: node.title,
      imgUrl: node.image?.url || node.image?.src || "",
      altText: node.image?.altText || node.title,
    }));

    if (loading) {
      return (
        <section className="bg-background px-[5%] pt-10 pb-6 md:pt-10 md:pb-12">
          <div className="mx-auto max-w-7xl">
            <SectionHeader title={title} subtitle={subtitle} className="mb-6 md:mb-8" />
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4 md:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i}>
                  <AspectRatio ratio={3 / 4} className="rounded-lg bg-neutral-100">
                    <Skeleton className="h-full w-full rounded-lg" />
                  </AspectRatio>
                  <div className="pt-3 space-y-2">
                    <Skeleton className="h-4 w-2/3 mx-auto" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }

    if (error) {
      return (
        <section className="bg-background px-[5%] pt-10 pb-6 md:pt-10 md:pb-12">
          <div className="mx-auto max-w-7xl">
            <SectionHeader title={title} subtitle={subtitle} className="mb-6 md:mb-8" />
            <p className="montserrat-500 text-primary/70 text-center">Error: {error}</p>
          </div>
        </section>
      );
    }

    if (collections.length === 0) return null;

    return (
      <section className="bg-background px-[5%] pt-10 pb-6 md:pt-10 md:pb-12">
        <div className="mx-auto max-w-7xl">
          <SectionHeader title={title} subtitle={subtitle} className="mb-6 md:mb-8" />
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4 md:gap-6">
            {collections.map((c) => (
              <div key={c.id} className="group/card">
                <Link href={`/collections/${c.handle}`}
                  aria-label={c.title}
                  className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 rounded-lg"
                >
                  <div className="relative overflow-hidden rounded-lg">
                    <AspectRatio ratio={3 / 4} className="bg-[#f5f0ed]">
                      {c.imgUrl ? (
                        <img
                          src={c.imgUrl}
                          alt={c.altText}
                          className="absolute inset-0 h-full w-full object-cover select-none transition-transform duration-500 ease-out group-hover/card:scale-[1.04]"
                          draggable="false"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
                          No image
                        </div>
                      )}
                    </AspectRatio>
                  </div>
                  <div className="pt-3 px-0.5">
                    <h3
                      className="montserrat-500 text-[12px] md:text-[13px] uppercase tracking-[0.15em] text-[#2d2d2d] leading-snug text-center"
                      title={c.title}
                    >
                      {c.title}
                    </h3>
                  </div>
                </Link>
              </div>
            ))}
          </div>
          {showHeaderLink && (
            <div className="mt-5 flex justify-center md:mt-6">
              <Link href="/collections/all"
                className="inline-flex items-center justify-center rounded-lg border border-primary px-6 py-3 text-[11px] md:text-[12px] montserrat-600 uppercase tracking-[0.3em] text-primary transition-colors duration-200 hover:bg-primary hover:text-white"
              >
                View All
              </Link>
            </div>
          )}
        </div>
      </section>
    );
  }

  /* ================== RENDER PRODUCTS MODE ================== */

  const products = useMemo(() => {
    const edges = data?.collection?.products?.edges ?? [];
    return edges.map(({ node }) => {
      let ratingValue = 0;
      if (node.rating?.value) {
        try {
          const parsed = JSON.parse(node.rating.value);
          ratingValue = Number.parseFloat(parsed?.value ?? 0) || 0;
        } catch { }
      }
      const img = node.images?.edges?.[0]?.node;
      const img2 = node.images?.edges?.[1]?.node;
      const vars = node.variants?.edges ?? [];
      const isAvailable = (vNode) => vNode && vNode.availableForSale && (vNode.quantityAvailable == null || vNode.quantityAvailable > 0);
      const firstAvailable = vars.find(v => isAvailable(v.node))?.node || vars[0]?.node;

      const img1Url = img?.url ?? "https://via.placeholder.com/600x800";
      const img2Url = img2?.url && img2?.url !== img?.url ? img2.url : null;

      return {
        id: node.id,
        title: node.title,
        handle: node.handle,
        price: node.priceRange?.minVariantPrice?.amount,
        currency: node.priceRange?.minVariantPrice?.currencyCode,
        imageUrl: img1Url,
        altText: img?.altText || node.title,
        secondImageUrl: img2Url,
        secondAltText: img2?.altText || img?.altText || node.title,
        ratingValue,
        variantId: firstAvailable?.id ?? null,
        available: vars.some(v => isAvailable(v.node)),
        variantCount: vars.length,
      };
    });
  }, [data]);

  const [adding, setAdding] = useState({});

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
          window.dispatchEvent(new CustomEvent("cart:item-added"));
        } catch { }

        trackAddToCart({
          productGid: product.id,
          variantGid: product.variantId,
          productTitle: product.title,
          price: product.price ?? '0',
          cartId: cartData?.id ?? cartId ?? '',
          quantity: 1,
        });

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

  // Loading / Error
  if (loading) {
    return (
      <section className="bg-background px-[5%] pt-10 pb-6 md:pt-10 md:pb-12">
        <div className="mx-auto max-w-7xl">
          <SectionHeader title={title} subtitle={subtitle} className="mb-6 md:mb-8" />
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4 md:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <AspectRatio ratio={3 / 4} className="rounded-lg bg-neutral-100">
                  <Skeleton className="h-full w-full rounded-lg" />
                </AspectRatio>
                <div className="pt-3 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-background px-[5%] pt-10 pb-6 md:pt-10 md:pb-12">
        <div className="mx-auto max-w-7xl">
          <SectionHeader title={title} subtitle={subtitle} className="mb-6 md:mb-8" />
          <p className="montserrat-500 text-primary/70 text-center">Error loading products: {error}</p>
        </div>
      </section>
    );
  }

  if (!data?.collection || products.length === 0) return null;

  const linkTo = mode === "collections" ? "/collections" : `/collections/${handle}`;

  return (
    <section className="bg-background px-[5%] pt-10 pb-6 md:pt-10 md:pb-12">
      <div className="mx-auto max-w-7xl">
        <SectionHeader title={title} subtitle={subtitle} className="mb-6 md:mb-8" />

        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4 md:gap-6">
          {products.map((product, idx) => {
            const addState = adding[product.id];
            return (
              <div key={product.id} className={idx >= 3 ? "block md:hidden xl:block" : ""}>
                <ProductCard
                  product={product}
                  eager={idx < 2}
                  onAddToCart={handleAddToCart}
                  isAddBusy={addState === true}
                  justAdded={addState === "added"}
                  showWishlistButton
                />
              </div>
            );
          })}
        </div>
        {showHeaderLink && linkTo && (
          <div className="mt-5 flex justify-center md:mt-6">
            <Link href={linkTo}
              className="inline-flex items-center justify-center rounded-lg border border-primary px-6 py-3 text-[11px] md:text-[12px] montserrat-600 uppercase tracking-[0.16em] text-primary transition-colors duration-200 hover:bg-primary hover:text-white"
            >
              View All
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
