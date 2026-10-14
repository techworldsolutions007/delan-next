'use client';
import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { shopify } from "@/lib/shopify";
import { Skeleton } from "@/components/ui/skeleton";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { CART_CREATE, CART_LINES_ADD } from "@/lib/queries";
import { releaseFocusForCheckout } from "@/lib/checkout-helpers";
import { trackAddToCart } from "@/lib/analytics";
import { useQuickBuy } from "@/context/QuickBuyContext";
import SectionHeader from "@/components/ui/SectionHeader";
import ProductCard from "@/components/Product/ProductCard";

const MAX_ITEMS = 4;
const CART_ID_KEY = "shopifyCartId";
const COLLECTION_HANDLE = "the-current-edit";

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

/* GraphQL Query for Collection Products */
const GET_COLLECTION_PRODUCTS = /* GraphQL */ `
  query getCollectionProducts($handle: String!, $first: Int!) {
    collection(handle: $handle) {
      id
      title
      products(first: $first) {
        edges {
          node {
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
            variants(first: 10) {
              edges {
                node {
                  id
                  availableForSale
                  price {
                    amount
                    currencyCode
                  }
                  compareAtPrice {
                    amount
                    currencyCode
                  }
                }
              }
            }
            rating: metafield(namespace: "reviews", key: "rating") {
              value
            }
          }
        }
      }
    }
  }
`;

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

export default function TheCurrentEdit() {
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
            s.src =
                "https://pdp.gokwik.co/merchant-integration/build/merchant.integration.js?v4";
            s.onload = () => {
                try {
                    if (window.gokwikSdk?.init) window.gokwikSdk.init();
                } catch { }
                setGokwikReady(
                    Boolean(window.triggerGokwikCustomCheckout || window.gokwikSdk)
                );

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

    /* -------------------------- Data: Collection products -------------------------- */
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                setError(null);
                const d = await shopify(GET_COLLECTION_PRODUCTS, {
                    handle: COLLECTION_HANDLE,
                    first: MAX_ITEMS,
                });
                if (!cancelled) setData(d);
            } catch (e) {
                console.error(e);
                if (!cancelled) setError(e?.message || "Failed to load products");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const products = useMemo(() => {
        const edges = data?.collection?.products?.edges ?? [];
        return edges
            .map(({ node }) => {
                const img1 = node.images?.edges?.[0]?.node;
                const img2 = node.images?.edges?.[1]?.node;

                let ratingValue = 0;
                if (node.rating?.value) {
                    try {
                        const parsed = JSON.parse(node.rating.value);
                        ratingValue = Number.parseFloat(parsed?.value ?? 0) || 0;
                    } catch { }
                }

                const vars = node.variants?.edges?.map((e) => e.node) ?? [];
                const firstAvailable = vars.find(v => v.availableForSale) || vars[0];
                if (!firstAvailable) return null;

                const price = Number.parseFloat(firstAvailable?.price?.amount ?? "0");

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
                    variantId: firstAvailable.id,
                    available: vars.some(v => v.availableForSale),
                    price,
                    currency: firstAvailable?.price?.currencyCode,
                    variantCount: vars.length,
                };
            })
            .filter(Boolean);
    }, [data]);

    /* ── Cart logic ────────────────────────────────────────── */
    const [addBusy, setAddBusy] = useState({});

    const createCart = useCallback(async (lines = []) => {
        const res = await shopify(CART_CREATE, { lines });
        const errs = res?.cartCreate?.userErrors;
        if (errs?.length) throw new Error(errs.map((e) => e.message).join("; "));
        const cart = res?.cartCreate?.cart;
        if (!cart?.id) throw new Error("Cart creation failed.");
        setStoredCartId(cart.id);
        return cart;
    }, []);

    const ensureCartId = useCallback(async () => {
        let id = getStoredCartId();
        if (id) {
            try {
                const check = await shopify(CART_QUERY, { cartId: id });
                if (check?.cart?.id) return id;
                clearStoredCartId();
            } catch {
                clearStoredCartId();
            }
        }
        const fresh = await createCart([]);
        return fresh.id;
    }, [createCart]);

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
                return res?.cartLinesAdd?.cart;
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

    // ─── Loading ─────────────────────────────────────
    if (loading) {
        return (
            <section id="the-current-edit" className="bg-background px-[5%] pt-10 pb-6 md:pt-10 md:pb-12">
                <SectionHeader
                    title="The Current Edit"
                    subtitle="New arrivals worth reaching for — drop by drop, season by season."
                    className="mb-6 md:mb-8"
                />
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 max-w-7xl mx-auto">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className={i >= 3 ? "block md:hidden xl:block" : ""}>
                            <AspectRatio ratio={3 / 4} className="rounded-lg bg-neutral-100">
                                <Skeleton className="h-full w-full rounded-lg" />
                            </AspectRatio>
                            <div className="pt-3 space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-1/3" />
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section id="the-current-edit" className="bg-background px-[5%] pt-10 pb-6 md:pt-10 md:pb-12">
                <SectionHeader title="The Current Edit" className="mb-6 md:mb-8" />
                <p className="montserrat-500 text-primary/70 text-center">
                    Error loading collection: {error}
                </p>
            </section>
        );
    }

    if (!products.length) return null;

    return (
        <section id="the-current-edit" className="bg-background px-[5%] pt-10 pb-6 md:pt-10 md:pb-12">
            <SectionHeader
                title="The Current Edit"
                subtitle="New arrivals worth reaching for — drop by drop, season by season."
                className="mb-6 md:mb-8"
            />

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 max-w-7xl mx-auto">
                {products.slice(0, 4).map((product, index) => {
                    const addState = addBusy[product.id];
                    return (
                        <div key={product.id} className={index >= 3 ? "block md:hidden xl:block" : ""}>
                            <ProductCard
                                product={product}
                                eager={index === 0}
                                onAddToCart={handleAddToCart}
                                isAddBusy={addState === true}
                                justAdded={addState === "added"}
                                showWishlistButton
                            />
                        </div>
                    );
                })}
            </div>
            <div className="mt-5 flex justify-center md:mt-6">
                <Link href={`/collections/${COLLECTION_HANDLE}`}
                    className="inline-flex items-center justify-center rounded-lg border border-primary px-6 py-3 text-[11px] md:text-[12px] montserrat-600 uppercase tracking-[0.16em] text-primary transition-colors duration-200 hover:bg-primary hover:text-white"
                >
                    View All
                </Link>
            </div>
        </section>
    );
}
