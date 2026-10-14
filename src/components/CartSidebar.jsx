'use client';
import Link from 'next/link';
import Image from 'next/image';
// src/components/CartSidebar.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, X, RefreshCw } from "lucide-react";
import { shopify } from "@/lib/shopify";
import { releaseFocusForCheckout } from "@/lib/checkout-helpers";
import { fetchAllLooksLite, pickLookMatesForCart } from "@/lib/looks";

/* ----------------------------- GraphQL queries ---------------------------- */
const CART_QUERY = /* GraphQL */ `
  query CartQuery($cartId: ID!) {
    cart(id: $cartId) {
      id
      checkoutUrl
      totalQuantity
      cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } }
      lines(first: 100) {
        edges {
          node {
            id
            quantity
            cost { subtotalAmount { amount currencyCode } }
            merchandise {
              ... on ProductVariant {
                id
                title
                sku
                availableForSale
                quantityAvailable
                price { amount currencyCode }
                image { url altText }
                product {
                  id title handle
                  collections(first: 10) {
                    edges { node { handle title } }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

const CART_CREATE = /* GraphQL */ `
  mutation CartCreate($lines: [CartLineInput!]) {
    cartCreate(input: { lines: $lines }) {
      cart { id checkoutUrl }
      userErrors { field message }
    }
  }
`;

const CART_LINES_UPDATE = /* GraphQL */ `
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart { id }
      userErrors { message }
    }
  }
`;

const CART_LINES_REMOVE = /* GraphQL */ `
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart { id }
      userErrors { message }
    }
  }
`;

/* Product recommendations */
const PRODUCT_RECS = /* GraphQL */ `
  query ProductRecs($productId: ID!) {
    productRecommendations(productId: $productId) {
      id
      title
      handle
      featuredImage { url altText }
      variants(first: 1) {
        nodes {
          id
          title
          price { amount currencyCode }
          compareAtPrice { amount currencyCode }
        }
      }
    }
  }
`;

/* --------------------------------- Helpers -------------------------------- */
const CART_ID_KEY = "shopifyCartId";
const CART_SNAPSHOT_KEY = "shopifyCartSnapshot";
const TIMEOUT_MS = 12000;
const QTY_DEBOUNCE_MS = 400;

const normalizeGokwikEnv = (raw) => {
  const v = (raw || "").toLowerCase();
  if (["prod", "production", "live"].includes(v)) return "production";
  return "uat";
};

const GOKWIK_ENABLED = (process.env.NEXT_PUBLIC_ENABLE_GOKWIK || "false").toLowerCase() === "true";
const GOKWIK_MID = (process.env.NEXT_PUBLIC_GOKWIK_MERCHANT_ID || "").trim();
const GOKWIK_ENV = normalizeGokwikEnv(process.env.NEXT_PUBLIC_GOKWIK_ENV || "production");
const RAW_STORE_ID = (process.env.NEXT_PUBLIC_GOKWIK_STORE_ID || process.env.NEXT_PUBLIC_SHOPIFY_STORE_ID || "").trim();
const GOKWIK_STORE_ID = Number.isFinite(Number(RAW_STORE_ID)) && RAW_STORE_ID !== "" ? Number(RAW_STORE_ID) : undefined;
const GOKWIK_FB_PIXEL = (process.env.NEXT_PUBLIC_FB_PIXEL_IDS || "").trim() || undefined;

const getStoredCartId = () => { try { return localStorage.getItem(CART_ID_KEY) || null; } catch { return null; } };
const setStoredCartId = (id) => { try { localStorage.setItem(CART_ID_KEY, id); } catch { } };
const clearStoredCartId = () => { try { localStorage.removeItem(CART_ID_KEY); } catch { } };
const getCartSnapshot = () => { try { const raw = localStorage.getItem(CART_SNAPSHOT_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } };
const setCartSnapshot = (cart) => { try { localStorage.setItem(CART_SNAPSHOT_KEY, JSON.stringify(cart)); } catch { } };

function emitCartQty(qty) {
  try { window.dispatchEvent(new CustomEvent("cart:updated", { detail: { totalQuantity: qty ?? 0 } })); } catch { }
}
async function unwrapAsync(resp) {
  let r = resp;
  if (r && typeof r.json === "function") { try { r = await r.json(); } catch { } }
  const body = r?.data ?? r;
  if (Array.isArray(r?.errors) && r.errors.length) throw new Error(r.errors.map(e => e.message).join("; "));
  return body;
}
function withTimeout(promise, ms = TIMEOUT_MS, label = "Request timed out") {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error(label)), ms))]);
}
function fmt(amount, code) {
  const a = Number.parseFloat(amount ?? 0);
  if (!Number.isFinite(a)) return "₹0";
  const locale = code === "INR" ? "en-IN" : undefined;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code || "INR",
      maximumFractionDigits: code === "INR" ? 0 : 2,
    }).format(a);
  } catch {
    return `${code || "₹"} ${a.toFixed(code === "INR" ? 0 : 2)}`;
  }
}
function rebuildCartFromEdges(cart, edges) {
  const lines = edges.map(e => e.node);
  const totalQuantity = lines.reduce((s, l) => s + (l.quantity || 0), 0);
  const subtotalAmount = lines.reduce((s, l) => {
    const amt = Number(l.cost?.subtotalAmount?.amount ?? 0);
    return s + (Number.isFinite(amt) ? amt : 0);
  }, 0);
  const currency = lines[0]?.cost?.subtotalAmount?.currencyCode ?? cart?.cost?.subtotalAmount?.currencyCode ?? "INR";
  return {
    ...cart,
    totalQuantity,
    lines: { edges },
    cost: { ...cart?.cost, subtotalAmount: { amount: String(subtotalAmount), currencyCode: currency } }
  };
}

/* -------------------------------- Component -------------------------------- */
export default function CartSidebar({ open, onOpenChange }) {
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState(null);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState({});
  const [notice, setNotice] = useState("");
  const noticeTimerRef = useRef(null);

  const pendingQtyRef = useRef({});
  const timersRef = useRef({});
  const lastWriteTSRef = useRef(0);

  const subtotal = cart?.cost?.subtotalAmount;
  const checkoutUrl = cart?.checkoutUrl;
  const lines = useMemo(() => cart?.lines?.edges?.map(e => e.node) ?? [], [cart]);

  const [lookMates, setLookMates] = useState([]);
  const [recs, setRecs] = useState([]);
  const [recsLoading, setRecsLoading] = useState(false);

  // GoKwik SDK state
  const [gokwikReady, setGokwikReady] = useState(false);

  const showNotice = useCallback((msg) => {
    setNotice(msg);
    clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(""), 2500);
  }, []);

  const ensureCart = useCallback(async () => {
    let id = getStoredCartId();
    if (!id) {
      const raw = await withTimeout(shopify(CART_CREATE, { lines: [] }));
      const d = await unwrapAsync(raw);
      const errs = d?.cartCreate?.userErrors;
      if (errs?.length) throw new Error(errs.map(e => e.message).join("; "));
      id = d?.cartCreate?.cart?.id;
      if (!id) throw new Error("Unable to create cart.");
      setStoredCartId(id);
    }
    return id;
  }, []);

  const fetchRecs = useCallback(async (cartObj) => {
    const edges = cartObj?.lines?.edges ?? [];
    const productIds = Array.from(
      new Set(edges.map(e => e?.node?.merchandise?.product?.id).filter(Boolean))
    );
    if (productIds.length === 0) {
      setLookMates([]);
      setRecs([]);
      return;
    }

    setRecsLoading(true);
    try {
      // ── 1. Look-mates: products from looks that share a cart item ────────
      let mates = [];
      try {
        const allLooks = await withTimeout(fetchAllLooksLite(shopify), 8000, "looks timeout");
        mates = pickLookMatesForCart(productIds, allLooks).slice(0, 4);
      } catch {
        // non-fatal — fall through to regular recs only
      }
      setLookMates(mates);

      // ── 2. Regular recs — Shopify productRecommendations ─────────────────
      const mateIds = new Set(mates.map(p => p.id));
      const cartSet = new Set(productIds);
      const seeds = productIds.slice(0, 3);

      const all = await Promise.all(
        seeds.map(pid =>
          withTimeout(shopify(PRODUCT_RECS, { productId: pid }))
            .then(unwrapAsync)
            .then(d => d?.productRecommendations ?? [])
            .catch(() => [])
        )
      );

      const uniq = [];
      const seen = new Set();
      for (const p of all.flat()) {
        if (!p?.id || seen.has(p.id)) continue;
        if (cartSet.has(p.id) || mateIds.has(p.id)) continue; // skip cart items & look-mates
        seen.add(p.id);
        uniq.push(p);
      }
      setRecs(uniq.slice(0, 6));
    } finally {
      setRecsLoading(false);
    }
  }, []);

  const setCartAndEmit = useCallback((nextCart) => {
    setCart(nextCart);
    setCartSnapshot(nextCart);
    emitCartQty(nextCart?.totalQuantity ?? 0);
    fetchRecs(nextCart);
  }, [fetchRecs]);

  const fetchCart = useCallback(async (showLoading = false) => {
    const t0 = Date.now();
    if (showLoading) { setError(""); setLoading(true); }
    try {
      const id = await ensureCart();
      const data = await withTimeout(shopify(CART_QUERY, { cartId: id })).then(unwrapAsync);
      if (t0 < lastWriteTSRef.current) return;
      if (!data?.cart) {
        clearStoredCartId();
        const fresh = await ensureCart();
        const data2 = await withTimeout(shopify(CART_QUERY, { cartId: fresh })).then(unwrapAsync);
        if (t0 < lastWriteTSRef.current) return;
        setCartAndEmit(data2?.cart ?? null);
      } else {
        setCartAndEmit(data.cart);
      }
    } catch (e) {
      console.error("[Cart] fetchCart error:", e);
      if (showLoading) setError(e?.message || "Failed to load cart.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [ensureCart, setCartAndEmit]);

  useEffect(() => {
    if (!open) return;
    const snap = getCartSnapshot();
    if (snap) setCart(snap);
    fetchCart(true);
  }, [open, fetchCart]);

  const scheduleQtySubmit = useCallback((lineId) => {
    clearTimeout(timersRef.current[lineId]);
    timersRef.current[lineId] = setTimeout(async () => {
      const qty = pendingQtyRef.current[lineId];
      if (qty == null) return;
      lastWriteTSRef.current = Date.now();
      try {
        const id = cart?.id || (await ensureCart());
        await withTimeout(shopify(CART_LINES_UPDATE, { cartId: id, lines: [{ id: lineId, quantity: qty }] })).then(unwrapAsync);
        fetchCart(false);
      } catch (e) {
        console.error("qty update failed:", e);
        fetchCart(false);
      } finally {
        delete pendingQtyRef.current[lineId];
        clearTimeout(timersRef.current[lineId]);
        delete timersRef.current[lineId];
      }
    }, QTY_DEBOUNCE_MS);
  }, [cart?.id, ensureCart, fetchCart]);

  const adjustQty = (lineId, delta) => {
    if (!cart?.id || !lineId) return;
    const edge = cart.lines.edges.find(e => e.node.id === lineId);
    if (!edge) return;

    const curr = edge.node.quantity || 1;
    const max = Number.isFinite(edge.node.merchandise?.quantityAvailable) ? edge.node.merchandise.quantityAvailable : Infinity;
    if (delta > 0 && curr >= max) { showNotice(max === 1 ? "Only 1 left in stock" : `Only ${max} left in stock`); return; }

    const nextQty = Math.max(0, curr + delta);
    if (nextQty < 1) { removeLine(lineId); return; }

    const newEdges = cart.lines.edges.map(e => {
      if (e.node.id !== lineId) return e;
      const node = { ...e.node, quantity: nextQty };
      const price = Number(node.merchandise?.price?.amount ?? node.cost?.subtotalAmount?.amount ?? 0);
      const currency = node.merchandise?.price?.currencyCode ?? node.cost?.subtotalAmount?.currencyCode;
      node.cost = { subtotalAmount: { amount: String(price * nextQty), currencyCode: currency } };
      return { ...e, node };
    });
    setCart(rebuildCartFromEdges(cart, newEdges));
    emitCartQty((cart?.totalQuantity ?? 0) + (delta));
    pendingQtyRef.current[lineId] = nextQty;
    scheduleQtySubmit(lineId);
  };

  const removeLine = async (lineId) => {
    if (!cart?.id || !lineId) return;
    if (removing[lineId]) return;
    if (timersRef.current[lineId]) {
      clearTimeout(timersRef.current[lineId]);
      delete timersRef.current[lineId];
      delete pendingQtyRef.current[lineId];
    }

    const prevCart = cart;
    const newEdges = cart.lines.edges.filter(e => e.node.id !== lineId);
    const optimistic = rebuildCartFromEdges(cart, newEdges);
    setCart(optimistic);
    setCartSnapshot(optimistic);
    emitCartQty(optimistic?.totalQuantity ?? 0);
    setRemoving(s => ({ ...s, [lineId]: true }));
    lastWriteTSRef.current = Date.now();

    try {
      await withTimeout(shopify(CART_LINES_REMOVE, { cartId: cart.id, lineIds: [lineId] })).then(unwrapAsync);
      fetchCart(false);
    } catch (e) {
      console.error(e);
      setCart(prevCart);
      setCartSnapshot(prevCart);
      alert(e?.message || "Could not remove item.");
    } finally {
      setRemoving(s => { const { [lineId]: _, ...rest } = s; return rest; });
    }
  };

  /* ----------------------- GoKwik SDK: load & trigger ---------------------- */
  useEffect(() => {
    if (!GOKWIK_ENABLED || !GOKWIK_MID) {
      setGokwikReady(false);
      return;
    }

    // Define merchantInfo BEFORE loading SDK; set both keys to be safe.
    window.merchantInfo = {
      ...(window.merchantInfo || {}),
      mid: GOKWIK_MID,
      merchantId: GOKWIK_MID,           // <- add alias (some setups use this)
      environment: GOKWIK_ENV,          // 'sandbox' | 'production'
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
        try { if (window.gokwikSdk?.init) window.gokwikSdk.init(); } catch { }
        setGokwikReady(Boolean(window.triggerGokwikCustomCheckout || window.gokwikSdk));
        // Helper: set cart just-in-time, then invoke GoKwik
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

    return () => { clearTimeout(noticeTimerRef.current); };
  }, []);

  const startGoKwikCheckout = useCallback(() => {
    const closeDrawer = () => onOpenChange?.(false);
    const fallbackToShopify = () => {
      closeDrawer();
      releaseFocusForCheckout();
      return checkoutUrl
        ? window.open(checkoutUrl, "_blank", "noopener,noreferrer")
        : showNotice("Checkout is temporarily unavailable. Please try again.");
    };

    const cartId = cart?.id; // gid://shopify/Cart/xxxx
    if (!cartId || !GOKWIK_ENABLED || !GOKWIK_MID) {
      return fallbackToShopify();
    }

    closeDrawer();
    releaseFocusForCheckout();

    try {
      if (typeof window.triggerGokwikCheckout === "function") {
        window.triggerGokwikCheckout(cartId);
        return;
      }
      // Fallback if helper not present yet
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
        return;
      }
    } catch {
      // swallow and fallback to Shopify checkout
    }
    // SDK not ready — native checkout
    return fallbackToShopify();
  }, [cart?.id, checkoutUrl, onOpenChange, showNotice]);

  /* --------------------------------- UI ----------------------------------- */
  const EmptyState = (
    <div className="flex h-full flex-col items-center justify-center text-center px-6">
      <h3 className="text-xl font-bold text-neutral-900">Your cart is empty.</h3>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[92vw] sm:w-[440px] p-0 flex flex-col overflow-hidden z-[120]">
        <SheetHeader className="px-5 pt-5 pb-4 shrink-0">
          <SheetTitle className="text-lg font-bold tracking-normal">My Cart</SheetTitle>
        </SheetHeader>

        {notice ? (
          <div className="mx-5 mb-2 rounded bg-amber-50 text-amber-900 text-xs px-3 py-2">
            {notice}
          </div>
        ) : null}

        <div className="flex-1 min-h-0">
          {loading && !cart ? (
            <div className="h-full overflow-y-auto px-5 py-5 [scrollbar-gutter:stable] pr-4 overscroll-contain">
              <CartSkeleton /><CartSkeleton /><CartSkeleton />
            </div>
          ) : error ? (
            <div className="p-6">
              <p className="text-sm text-red-600">{error}</p>
              <Button className="mt-3" variant="secondary" onClick={() => fetchCart(true)}>
                <RefreshCw className="mr-2 h-4 w-4" /> Try again
              </Button>
            </div>
          ) : !lines.length ? (
            EmptyState
          ) : (
            <div className="h-full overflow-y-auto px-5 py-3 [scrollbar-gutter:stable] pr-4 overscroll-contain">
              <ul className="divide-y divide-neutral-200">
                {lines.map((l) => {
                  const v = l.merchandise;
                  const img = v?.image?.url;
                  const alt = v?.image?.altText || v?.product?.title || v?.title || "Product";
                  const title = v?.product?.title || "Untitled";
                  const variant = v?.title && v.title !== "Default Title" ? v.title : "";
                  const lineTotal = l?.cost?.subtotalAmount;
                  const isRemoving = !!removing[l.id];
                  const max = Number.isFinite(v?.quantityAvailable) ? v.quantityAvailable : undefined;
                  return (
                    <li key={l.id} className="py-4 first:pt-1 transition-opacity duration-200" style={{ opacity: isRemoving ? 0.4 : 1 }}>
                      <div className="flex gap-3">
                        {/* Image with overlay remove button */}
                        <div className="relative shrink-0">
                          <Link
                            href={`/products/${v?.product?.handle ?? ""}`}
                            onClick={() => onOpenChange?.(false)}
                            className="block rounded-lg overflow-hidden bg-neutral-100"
                            aria-label={title}
                          >
                            {img ? (
                              <Image src={img} alt={alt} width={80} height={80} className="object-cover w-20 h-20" />
                            ) : (
                              <div className="h-20 w-20 bg-neutral-100" />
                            )}
                          </Link>
                          <button
                            className="absolute -top-2 -left-2 h-6 w-6 rounded-full bg-neutral-800 text-neutral-400 flex items-center justify-center ring-1 ring-neutral-600 hover:text-white disabled:pointer-events-none transition-colors"
                            onClick={() => removeLine(l.id)}
                            disabled={isRemoving}
                            aria-label="Remove item"
                          >
                            <X className="h-3.5 w-3.5" strokeWidth={2} />
                          </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-neutral-900 line-clamp-2 leading-snug">{title}</p>
                            <span className="shrink-0 whitespace-nowrap tabular-nums text-sm font-semibold ml-2">
                              {fmt(lineTotal?.amount, lineTotal?.currencyCode)}
                            </span>
                          </div>
                          {variant ? <p className="text-xs text-neutral-500 mt-0.5">{variant}</p> : null}

                          {/* Quantity pill — right-aligned */}
                          <div className="mt-2 flex justify-end">
                            <div className="inline-flex items-center h-8 rounded-full border border-neutral-300">
                              <button
                                className="h-8 w-8 grid place-items-center hover:bg-neutral-100 rounded-l-full transition-colors"
                                onClick={() => adjustQty(l.id, -1)}
                                aria-label="Decrease quantity"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="px-2 text-sm tabular-nums min-w-[1.5rem] text-center">{l.quantity}</span>
                              <button
                                className="h-8 w-8 grid place-items-center hover:bg-neutral-100 rounded-r-full transition-colors"
                                onClick={() => adjustQty(l.id, +1)}
                                aria-label="Increase quantity"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* ── Recommendations ── */}
              {recsLoading ? (
                <div className="mt-8 space-y-4">
                  <div className="h-5 w-40 bg-neutral-200 rounded animate-pulse" />
                  {[...Array(3)].map((_, i) => (
                    <div key={i}>
                      <div className="flex items-center gap-4 animate-pulse">
                        <div className="h-20 w-20 rounded-lg bg-neutral-200 shrink-0" />
                        <div className="flex-1 space-y-3">
                          <div className="h-4 w-2/3 bg-neutral-200 rounded" />
                          <div className="h-3 w-1/3 bg-neutral-200 rounded" />
                        </div>
                        <div className="h-9 w-16 rounded border bg-neutral-100 shrink-0" />
                      </div>
                      {i < 2 && <Separator className="my-4" />}
                    </div>
                  ))}
                </div>
              ) : (lookMates.length > 0 || recs.length > 0) ? (
                <div className="mt-8">
                  {/* ── Look-mates first ── */}
                  {lookMates.length > 0 && (
                    <div>
                      <h3 className="text-base font-semibold mb-3 tracking-[0.025em]">
                        Complete the Look
                      </h3>
                      <ul className="divide-y divide-neutral-200">
                        {lookMates.map((p) => {
                          const img = p?.featuredImage?.url;
                          const alt = p?.featuredImage?.altText || p?.title || "Product";
                          const price = p?.priceRange?.minVariantPrice;
                          return (
                            <li key={p.id} className="py-4">
                              <div className="flex items-center gap-4">
                                <Link href={`/products/${p.handle}`} onClick={() => onOpenChange?.(false)}
                                  className="block shrink-0 rounded-lg overflow-hidden bg-neutral-100" aria-label={p.title}>
                                  {img ? (
                                    <Image src={img} alt={alt} width={80} height={80} className="object-cover w-20 h-20" />
                                  ) : (
                                    <div className="h-20 w-20 bg-neutral-100" />
                                  )}
                                </Link>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-neutral-900">{p.title}</p>
                                  {price?.amount && (
                                    <span className="mt-1 block text-sm font-semibold tabular-nums">
                                      {fmt(price.amount, price.currencyCode)}
                                    </span>
                                  )}
                                </div>
                                <Link href={`/products/${p.handle}`} onClick={() => onOpenChange?.(false)}
                                  className="inline-flex items-center justify-center h-9 px-4 shrink-0 rounded border border-primary text-sm text-primary font-medium hover:bg-primary hover:text-white transition-colors">
                                  View
                                </Link>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {/* ── Regular recs below ── */}
                  {recs.length > 0 && (
                    <div className={lookMates.length > 0 ? "mt-6" : ""}>
                      <h3 className="text-base font-semibold mb-3 tracking-[0.025em]">
                        You may also like
                      </h3>
                      <ul className="divide-y divide-neutral-200">
                        {recs.map((p) => {
                          const img = p?.featuredImage?.url;
                          const alt = p?.featuredImage?.altText || p?.title || "Product";
                          const v = p?.variants?.nodes?.[0];
                          const price = v?.price;
                          const compare = v?.compareAtPrice;
                          return (
                            <li key={p.id} className="py-4">
                              <div className="flex items-center gap-4">
                                <Link href={`/products/${p.handle}`} onClick={() => onOpenChange?.(false)}
                                  className="block shrink-0 rounded-lg overflow-hidden bg-neutral-100" aria-label={p.title}>
                                  {img ? (
                                    <Image src={img} alt={alt} width={80} height={80} className="object-cover w-20 h-20" />
                                  ) : (
                                    <div className="h-20 w-20 bg-neutral-100" />
                                  )}
                                </Link>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-neutral-900">{p.title}</p>
                                  <div className="mt-1 flex items-center gap-2">
                                    <span className="text-sm font-semibold tabular-nums">{fmt(price?.amount, price?.currencyCode)}</span>
                                    {compare?.amount && Number(compare.amount) > Number(price?.amount ?? 0) ? (
                                      <span className="text-xs text-neutral-500 line-through tabular-nums">
                                        {fmt(compare.amount, compare.currencyCode)}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                                <Link href={`/products/${p.handle}`} onClick={() => onOpenChange?.(false)}
                                  className="inline-flex items-center justify-center h-9 px-4 shrink-0 rounded border border-primary text-sm text-primary font-medium hover:bg-primary hover:text-white transition-colors">
                                  View
                                </Link>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* ── Footer: only when cart has items ── */}
        {lines.length > 0 && <div className="shrink-0 px-5 pt-1 pb-5 border-t border-neutral-200">
          {/* Total row */}
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-neutral-700">Total</span>
            <span className="text-sm font-semibold tabular-nums whitespace-nowrap">
              {fmt(subtotal?.amount ?? 0, subtotal?.currencyCode ?? "INR")}
            </span>
          </div>
          <Separator />

          {/* Note */}
          <p className="text-xs text-neutral-500 py-3">
            Taxes &amp; shipping calculated at checkout.
          </p>

          {/* Proceed to Checkout — full-width pill */}
          <Button
            id="checkoutButton"
            disabled={lines.length === 0 || !cart?.id || (!gokwikReady && !checkoutUrl)}
            onClick={startGoKwikCheckout}
            className="w-full h-12 rounded-full bg-primary hover:bg-primary/90 text-white text-sm font-medium tracking-wide active:scale-[0.98] transition-all disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-primary disabled:active:scale-100"
            title={!gokwikReady && checkoutUrl ? "Loading checkout…" : "Proceed to Checkout"}
          >
            Proceed to Checkout
          </Button>
        </div>}
      </SheetContent>
    </Sheet>
  );
}

/* -------------------------------- Skeleton -------------------------------- */
function CartSkeleton() {
  return (
    <div className="flex gap-4 animate-pulse">
      <div className="h-24 w-20 rounded-lg bg-neutral-200" />
      <div className="flex-1 space-y-3">
        <div className="h-4 w-2/3 bg-neutral-200 rounded" />
        <div className="h-3 w-1/3 bg-neutral-200 rounded" />
        <div className="mt-4 flex items-center justify-between">
          <div className="h-9 w-28 bg-neutral-200 rounded-full" />
          <div className="h-4 w-20 bg-neutral-200 rounded" />
        </div>
      </div>
    </div>
  );
}
