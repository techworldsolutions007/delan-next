'use client';
import { useParams } from 'next/navigation';
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { shopify } from "@/lib/shopify";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuickBuy } from "@/context/QuickBuyContext";
import ProductCard from "@/components/Product/ProductCard";
import {
  GET_PRODUCT_RECOMMENDATIONS,
  CART_CREATE,
  CART_LINES_ADD,
} from "@/lib/queries";
import { releaseFocusForCheckout } from "@/lib/checkout-helpers";
import { trackAddToCart } from "@/lib/analytics";
import { isPreorder } from "@/lib/preorder";

const BRAND = "#642c44";
const MAX_ITEMS = 5;
const CART_ID_KEY = "shopifyCartId";

/* -------------------- Fallback helpers / queries -------------------- */

// On collection pages, resolve a product id from collection handle
const GET_COLLECTION_BY_HANDLE = `
  query GetCollection($handle: String!) {
    collection(handle: $handle) {
      id
      title
      products(first: 1) {
        edges {
          node { id handle }
        }
      }
    }
  }
`;

// Resolve product id by product handle
const GET_PRODUCT_ID_BY_HANDLE = /* GraphQL */ `
  query getProductIdByHandle($handle: String!) {
    product(handle: $handle) { id }
  }
`;

// Fetch product details by ID (used to hydrate missing/partial variant availability)
const GET_PRODUCT_MINI_BY_ID = /* GraphQL */ `
  query ProductMini($id: ID!) {
    node(id: $id) {
      ... on Product {
        id
        handle
        availableForSale
        priceRange { minVariantPrice { amount currencyCode } }
        images(first: 2) {
          edges { node { url altText } }
        }
        variants(first: 250) {
          edges {
            node {
              id
              availableForSale
              price { amount currencyCode }
            }
          }
        }
        collections(first: 5) { edges { node { handle title } } }
      }
    }
  }
`;

// Minimal cart fetch (fallback to recover checkoutUrl)
const CART_QUERY = /* GraphQL */ `
  query CartQuery($cartId: ID!) {
    cart(id: $cartId) {
      id
      checkoutUrl
    }
  }
`;

/* -------------------- GoKwik env helpers -------------------- */
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

/* -------------------- UI helpers -------------------- */

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
      ₹{Number.isFinite(num) ? num.toFixed(0) : "0"}
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

/* -------------------- Component -------------------- */

export default function SuggestionSection({
  productId,
  title = "You Might Also Like",
  max = MAX_ITEMS,
  showPrice = true,
}) {
  const { handle: routeHandle } = useParams();

  const [pid, setPid] = useState(productId ?? null);
  const [loadingId, setLoadingId] = useState(!productId && !!routeHandle);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // raw recommendations from Shopify
  const [recommendations, setRecommendations] = useState([]);

  // normalized + hydrated products ready for UI
  const [normalized, setNormalized] = useState([]);

  // GoKwik SDK state (not shown in UI, used for logs)
  const [gokwikReady, setGokwikReady] = useState(false);
  const { openQuickBuy } = useQuickBuy();

  /* 0) GoKwik: load SDK once and set merchantInfo */
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

  /* Helper to trigger GoKwik or fall back to Shopify checkout */
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

  /* 1) Resolve a product ID from the route if needed (collection or product page) */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (productId) {
        setPid(productId);
        setLoadingId(false);
        return;
      }
      if (!routeHandle) {
        setLoadingId(false);
        return;
      }

      const isCollectionPath =
        typeof window !== "undefined" &&
        window.location &&
        window.location.pathname &&
        window.location.pathname.includes("/collections/");

      try {
        setLoadingId(true);
        if (isCollectionPath) {
          const col = await shopify(GET_COLLECTION_BY_HANDLE, { handle: routeHandle });
          const first = col?.collection?.products?.edges?.[0]?.node;
          if (!cancelled) setPid(first?.id ?? null);
        } else {
          const d = await shopify(GET_PRODUCT_ID_BY_HANDLE, { handle: routeHandle });
          if (!cancelled) setPid(d?.product?.id ?? null);
        }
      } catch (err) {
        console.warn("SuggestionSection: could not resolve id by handle", err);
        if (!cancelled) setPid(null);
      } finally {
        if (!cancelled) setLoadingId(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId, routeHandle]);

  /* 2) Fetch recommendations */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!pid) {
        setRecommendations([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const d = await shopify(GET_PRODUCT_RECOMMENDATIONS, { productId: pid });
        if (!cancelled) setRecommendations(d?.productRecommendations ?? []);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError(e?.message || "Failed to load suggestions");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pid]);

  /* 3) Normalize from recommendations (quick pass) */
  const prelim = useMemo(() => {
    return (recommendations || []).map((node) => {
      const imgs = node?.images?.edges ?? [];
      const img1 = imgs[0]?.node;
      const img2 = imgs[1]?.node;

      const vEdges = node?.variants?.edges ?? [];
      const firstAvailableEdge = vEdges.find((e) => e?.node?.availableForSale);
      const fallbackEdge = vEdges[0];
      const chosenVariant = (firstAvailableEdge || fallbackEdge)?.node ?? null;

      const anyAvailableFromEdges = vEdges.some((e) => e?.node?.availableForSale);
      const productLevelAvailable = !!node?.availableForSale;

      const priceAmount =
        chosenVariant?.price?.amount ??
        node?.priceRange?.minVariantPrice?.amount ??
        "0";
      const currencyCode =
        chosenVariant?.price?.currencyCode ??
        node?.priceRange?.minVariantPrice?.currencyCode ??
        "INR";

      return {
        id: node?.id,
        handle: node?.handle,
        title: node?.title,
        imageUrl: img1?.url || "https://via.placeholder.com/600x800",
        altText: img1?.altText || node?.title || "Product image",
        secondImageUrl: img2?.url && img2?.url !== img1?.url ? img2.url : null,
        secondAltText: img2?.altText || img1?.altText || node?.title || "Product image",
        ratingValue: 0, // wire your metafield if present
        variantId: chosenVariant?.id ?? null,
        price: priceAmount,
        currency: currencyCode,
        available: anyAvailableFromEdges || productLevelAvailable || false,
        variantCount: vEdges.length,
        _needsHydration:
          (!anyAvailableFromEdges && !!productLevelAvailable) ||
          (!chosenVariant?.id) ||
          (vEdges.length === 0),
      };
    });
  }, [recommendations]);

  /* 4) Hydrate products that still look unavailable / missing variants */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!prelim?.length) {
        setNormalized([]);
        return;
      }

      const toHydrate = prelim.filter((p) => p._needsHydration);
      const passThrough = prelim.filter((p) => !p._needsHydration);

      if (toHydrate.length === 0) {
        if (!cancelled) setNormalized(prelim.map(({ _needsHydration, ...r }) => r));
        return;
      }

      const hydrated = await Promise.all(
        toHydrate.map(async (p) => {
          try {
            const resp = await shopify(GET_PRODUCT_MINI_BY_ID, { id: p.id });
            const node = resp?.node;

            const imgs = node?.images?.edges ?? [];
            const img1 = imgs[0]?.node;
            const img2 = imgs[1]?.node;

            const vEdges = node?.variants?.edges ?? [];
            const firstAvailableEdge = vEdges.find((e) => e?.node?.availableForSale);
            const fallbackEdge = vEdges[0];
            const chosenVariant = (firstAvailableEdge || fallbackEdge)?.node ?? null;

            const anyAvailable =
              node?.availableForSale || vEdges.some((e) => e?.node?.availableForSale);

            const priceAmount =
              chosenVariant?.price?.amount ??
              node?.priceRange?.minVariantPrice?.amount ??
              "0";
            const currencyCode =
              chosenVariant?.price?.currencyCode ??
              node?.priceRange?.minVariantPrice?.currencyCode ??
              "INR";

            return {
              id: node?.id ?? p.id,
              handle: node?.handle ?? p.handle,
              title: node?.title ?? p.title,
              imageUrl: img1?.url || p.imageUrl,
              altText: img1?.altText || p.altText,
              secondImageUrl:
                img2?.url && img2?.url !== img1?.url ? img2.url : p.secondImageUrl,
              secondAltText: img2?.altText || p.secondAltText,
              ratingValue: p.ratingValue ?? 0,
              variantId: chosenVariant?.id ?? p.variantId,
              price: priceAmount,
              currency: currencyCode,
              available: !!anyAvailable,
              variantCount: vEdges.length,
              collections: node?.collections,
            };
          } catch (e) {
            console.warn("Hydration failed for", p.id, e);
            return {
              id: p.id,
              handle: p.handle,
              title: p.title,
              imageUrl: p.imageUrl,
              altText: p.altText,
              secondImageUrl: p.secondImageUrl,
              secondAltText: p.secondAltText,
              ratingValue: p.ratingValue,
              variantId: p.variantId,
              price: p.price,
              currency: p.currency,
              available: p.available,
            };
          }
        })
      );

      const merged = [...passThrough, ...hydrated].map(({ _needsHydration, ...r }) => r);
      if (!cancelled) setNormalized(merged);
    })();

    return () => {
      cancelled = true;
    };
  }, [prelim]);

  const productsToShow = useMemo(
    () => (normalized || []).slice(0, max),
    [normalized, max]
  );

  // Add-to-cart: use tri-state map (true => spinner, "added" => checkmark, false/undefined => idle)
  const [adding, setAdding] = useState({});
  const [buying, setBuying] = useState({});

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
          window.dispatchEvent(new CustomEvent("cart:open"));
        } catch { }

        trackAddToCart({
          productGid: product.id,
          variantGid: product.variantId,
          productTitle: product.title,
          price: product.price ?? '0',
          cartId: cartData?.id ?? cartId ?? '',
          quantity: 1,
        });

        // show ✓ briefly
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

  /* -------------------- Render -------------------- */

  if (loading) {
    return (
      <section id="suggestions-section" className="bg-white py-6 sm:py-10">
        <div className="mx-auto max-w-7xl px-[5%]">
          <h2 className="cormorant-garamond-700 text-primary text-3xl md:text-4xl lg:text-4xl mb-5 sm:mb-8 text-center">
            {title}
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
      <section id="suggestions-section" className="bg-white px-[5%] py-6 sm:py-12">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="cormorant-garamond-700 text-primary text-3xl md:text-4xl lg:text-4xl mb-3 sm:mb-4">
            {title}
          </h2>
          <p className="montserrat-500 text-[color:var(--brand-642, #642c44)]/80">
            Error loading suggestions: {error}
          </p>
        </div>
      </section>
    );
  }

  if (!productsToShow.length) return null;

  return (
    <section id="suggestions-section" className="bg-white py-6 sm:py-10">
      <div className="mx-auto max-w-7xl px-[5%]">
        <h2 className="cormorant-garamond-700 uppercase text-primary text-3xl md:text-4xl lg:text-4xl mb-5 sm:mb-8 text-center">
          {title}
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
                  showPrice={showPrice}
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
