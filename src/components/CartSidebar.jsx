'use client';
import Link from 'next/link';
import Image from 'next/image';
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus, X, RefreshCw, Trash2 } from "lucide-react";
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
                  relatedStyles: metafield(namespace: "custom", key: "related_styles") {
                    references(first: 5) {
                      nodes {
                        ... on Product {
                          id title handle
                          featuredImage { url altText }
                          priceRange { minVariantPrice { amount currencyCode } }
                        }
                      }
                    }
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

  // Back-button closes the cart instead of navigating away
  const historyPushedRef = useRef(false);
  useEffect(() => {
    if (open) {
      history.pushState({ cartOpen: true }, '');
      historyPushedRef.current = true;
    } else if (historyPushedRef.current) {
      historyPushedRef.current = false;
      if (history.state?.cartOpen === true) {
        history.back();
      }
    }
  }, [open]);

  useEffect(() => {
    const handlePopState = () => {
      if (open) onOpenChange?.(false);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [open, onOpenChange]);

  const subtotal = cart?.cost?.subtotalAmount;
  const checkoutUrl = cart?.checkoutUrl;
  const lines = useMemo(() => cart?.lines?.edges?.map(e => e.node) ?? [], [cart]);

  // Products from product metafield "related_styles" across all cart items
  const pairItWith = useMemo(() => {
    const cartProductIds = new Set(lines.map(l => l.merchandise?.product?.id).filter(Boolean));
    const seen = new Set();
    const result = [];
    for (const line of lines) {
      const nodes = line.merchandise?.product?.relatedStyles?.references?.nodes ?? [];
      for (const p of nodes) {
        if (!p?.id || seen.has(p.id) || cartProductIds.has(p.id)) continue;
        seen.add(p.id);
        result.push(p);
      }
    }
    return result;
  }, [lines]);

  const [lookMates, setLookMates] = useState([]);
  const [recs, setRecs] = useState([]);
  const [recsLoading, setRecsLoading] = useState(false);

  // Merge pairItWith (metafield, highest priority) + lookMates into one "Complete the Look" list
  const completeTheLook = useMemo(() => {
    const seen = new Set(pairItWith.map(p => p.id));
    const cartIds = new Set(lines.map(l => l.merchandise?.product?.id).filter(Boolean));
    const combined = [...pairItWith];
    for (const p of lookMates) {
      if (!seen.has(p.id) && !cartIds.has(p.id)) {
        seen.add(p.id);
        combined.push(p);
      }
    }
    return combined.slice(0, 5);
  }, [pairItWith, lookMates, lines]);

  // Filter recs: skip anything already in "Complete the Look"
  const filteredRecs = useMemo(() => {
    const lookIds = new Set(completeTheLook.map(p => p.id));
    return recs.filter(p => !lookIds.has(p.id)).slice(0, 4);
  }, [recs, completeTheLook]);

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
      let mates = [];
      try {
        const allLooks = await withTimeout(fetchAllLooksLite(shopify), 8000, "looks timeout");
        mates = pickLookMatesForCart(productIds, allLooks).slice(0, 4);
      } catch {
        // non-fatal
      }
      setLookMates(mates);

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
        if (cartSet.has(p.id) || mateIds.has(p.id)) continue;
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
        try { if (window.gokwikSdk?.init) window.gokwikSdk.init(); } catch { }
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
      s.onerror = () => { setGokwikReady(false); };
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

    const cartId = cart?.id;
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
      // fallback to Shopify
    }
    return fallbackToShopify();
  }, [cart?.id, checkoutUrl, onOpenChange, showNotice]);

  /* --------------------------------- UI ----------------------------------- */
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[440px] p-0 flex flex-col gap-0 overflow-hidden z-[120] h-[100dvh]">

        {/* ── HEADER ── */}
        <div className="shrink-0 flex items-center justify-between px-5 h-14 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <SheetTitle className="text-[15px] font-semibold tracking-wide text-neutral-900">
              Your Bag
            </SheetTitle>
            {(cart?.totalQuantity ?? 0) > 0 && (
              <span className="inline-flex items-center justify-center h-[18px] min-w-[18px] rounded-full bg-primary/10 text-primary text-[10px] font-semibold px-1.5 tabular-nums leading-none">
                {cart.totalQuantity}
              </span>
            )}
          </div>
          <SheetClose asChild>
            <button
              className="flex items-center justify-center h-8 w-8 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
              aria-label="Close cart"
            >
              <X className="h-[15px] w-[15px]" strokeWidth={1.75} />
            </button>
          </SheetClose>
        </div>

        {/* ── NOTICE ── */}
        {notice ? (
          <div className="shrink-0 mx-5 mt-3 rounded-lg bg-amber-50 border border-amber-100 text-amber-800 text-xs px-3 py-2.5 leading-snug">
            {notice}
          </div>
        ) : null}

        {/* ── BODY ── */}
        <div className="flex-1 min-h-0">
          {loading && !cart ? (
            <div className="h-full overflow-y-auto no-scrollbar px-5 py-5 overscroll-contain space-y-5">
              <CartSkeleton />
              <CartSkeleton />
            </div>
          ) : error ? (
            <div className="p-6">
              <p className="text-sm text-red-500 mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={() => fetchCart(true)}>
                <RefreshCw className="mr-2 h-3.5 w-3.5" /> Try again
              </Button>
            </div>
          ) : !lines.length ? (
            /* ── EMPTY STATE ── */
            <div className="flex h-full flex-col items-center justify-center text-center px-8 pb-20">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 01-8 0" />
                </svg>
              </div>
              <p className="text-[13px] font-medium text-neutral-800">Your bag is empty</p>
              <p className="mt-1 text-[11px] text-neutral-400 leading-relaxed">Add pieces you love to get started.</p>
              <SheetClose asChild>
                <button className="mt-5 text-[12px] font-medium text-primary underline underline-offset-2 hover:text-primary/80 transition-colors">
                  Explore Collection
                </button>
              </SheetClose>
            </div>
          ) : (
            /* ── CART CONTENT ── */
            <div className="h-full overflow-y-auto no-scrollbar overscroll-contain">

              {/* Cart Items */}
              <ul className="divide-y divide-neutral-100 px-5">
                {lines.map((l) => {
                  const v = l.merchandise;
                  const img = v?.image?.url;
                  const alt = v?.image?.altText || v?.product?.title || v?.title || "Product";
                  const title = v?.product?.title || "Untitled";
                  const variant = v?.title && v.title !== "Default Title" ? v.title : "";
                  const lineTotal = l?.cost?.subtotalAmount;
                  const isRemoving = !!removing[l.id];
                  return (
                    <li
                      key={l.id}
                      className="py-4 transition-opacity duration-200"
                      style={{ opacity: isRemoving ? 0.4 : 1 }}
                    >
                      <div className="flex gap-3">
                        {/* Product image */}
                        <Link
                          href={`/products/${v?.product?.handle ?? ""}`}
                          onClick={() => onOpenChange?.(false)}
                          className="shrink-0 block w-[88px] h-[88px] rounded-lg overflow-hidden bg-neutral-100"
                          aria-label={title}
                        >
                          {img ? (
                            <Image src={img} alt={alt} width={88} height={88} className="object-cover w-full h-full" />
                          ) : (
                            <div className="w-full h-full bg-neutral-100" />
                          )}
                        </Link>

                        {/* Product details */}
                        <div className="flex-1 min-w-0 flex flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[13px] font-medium text-neutral-900 line-clamp-2 leading-snug">{title}</p>
                            <span className="shrink-0 text-[13px] font-semibold tabular-nums text-neutral-900 ml-1">
                              {fmt(lineTotal?.amount, lineTotal?.currencyCode)}
                            </span>
                          </div>

                          {variant ? (
                            <p className="text-[10px] text-neutral-400 mt-0.5 uppercase tracking-widest">{variant}</p>
                          ) : null}

                          {/* Qty controls + remove */}
                          <div className="mt-auto pt-2.5 flex items-center justify-between">
                            <div className="inline-flex items-center h-7 rounded-full border border-neutral-200 bg-white">
                              <button
                                className="h-7 w-7 grid place-items-center text-neutral-500 hover:text-neutral-900 rounded-l-full transition-colors"
                                onClick={() => adjustQty(l.id, -1)}
                                aria-label="Decrease quantity"
                              >
                                <Minus className="h-2.5 w-2.5" strokeWidth={2.5} />
                              </button>
                              <span className="px-2 text-[12px] tabular-nums min-w-[1.25rem] text-center font-medium text-neutral-800">
                                {l.quantity}
                              </span>
                              <button
                                className="h-7 w-7 grid place-items-center text-neutral-500 hover:text-neutral-900 rounded-r-full transition-colors"
                                onClick={() => adjustQty(l.id, +1)}
                                aria-label="Increase quantity"
                              >
                                <Plus className="h-2.5 w-2.5" strokeWidth={2.5} />
                              </button>
                            </div>

                            <button
                              className="p-1.5 text-neutral-300 hover:text-neutral-500 transition-colors disabled:pointer-events-none"
                              onClick={() => removeLine(l.id)}
                              disabled={isRemoving}
                              aria-label="Remove item"
                            >
                              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                            </button>
                          </div>
                        </div>
                      </div>

                    </li>
                  );
                })}
              </ul>

              {/* ── Complete the Look ── */}
              {(completeTheLook.length > 0 || recsLoading) && (
                <div className="px-5 mt-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400 mb-3">
                    Complete the Look
                  </p>
                  {recsLoading && completeTheLook.length === 0 ? (
                    <RecSkeleton />
                  ) : (
                    <ul className="divide-y divide-neutral-100">
                      {completeTheLook.map((p) => {
                        const img = p?.featuredImage?.url;
                        const alt = p?.featuredImage?.altText || p?.title || "Product";
                        const price = p?.priceRange?.minVariantPrice;
                        return (
                          <li key={p.id} className="py-3 first:pt-0">
                            <div className="flex items-center gap-3">
                              <Link
                                href={`/products/${p.handle}`}
                                onClick={() => onOpenChange?.(false)}
                                className="shrink-0 block w-[60px] h-[60px] rounded-md overflow-hidden bg-neutral-100"
                                aria-label={p.title}
                              >
                                {img ? (
                                  <Image src={img} alt={alt} width={60} height={60} className="object-cover w-full h-full" />
                                ) : (
                                  <div className="w-full h-full bg-neutral-100" />
                                )}
                              </Link>
                              <div className="min-w-0 flex-1">
                                <p className="text-[12px] font-medium text-neutral-800 line-clamp-2 leading-snug">{p.title}</p>
                                {price?.amount && (
                                  <span className="mt-0.5 block text-[12px] font-semibold tabular-nums text-neutral-900">
                                    {fmt(price.amount, price.currencyCode)}
                                  </span>
                                )}
                              </div>
                              <Link
                                href={`/products/${p.handle}`}
                                onClick={() => onOpenChange?.(false)}
                                className="shrink-0 inline-flex items-center justify-center h-7 px-3 rounded-full border border-neutral-300 text-[11px] font-medium text-neutral-600 hover:border-primary hover:text-primary transition-colors"
                              >
                                View
                              </Link>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}

              {/* ── You May Also Like ── */}
              {!recsLoading && filteredRecs.length > 0 && (
                <div className="px-5 mt-5 pb-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400 mb-3">
                    You May Also Like
                  </p>
                  <ul className="divide-y divide-neutral-100">
                    {filteredRecs.map((p) => {
                      const img = p?.featuredImage?.url;
                      const alt = p?.featuredImage?.altText || p?.title || "Product";
                      const v = p?.variants?.nodes?.[0];
                      const price = v?.price;
                      const compare = v?.compareAtPrice;
                      return (
                        <li key={p.id} className="py-3 first:pt-0">
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/products/${p.handle}`}
                              onClick={() => onOpenChange?.(false)}
                              className="shrink-0 block w-[60px] h-[60px] rounded-md overflow-hidden bg-neutral-100"
                              aria-label={p.title}
                            >
                              {img ? (
                                <Image src={img} alt={alt} width={60} height={60} className="object-cover w-full h-full" />
                              ) : (
                                <div className="w-full h-full bg-neutral-100" />
                              )}
                            </Link>
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-medium text-neutral-800 line-clamp-2 leading-snug">{p.title}</p>
                              <div className="mt-0.5 flex items-center gap-1.5">
                                <span className="text-[12px] font-semibold tabular-nums text-neutral-900">
                                  {fmt(price?.amount, price?.currencyCode)}
                                </span>
                                {compare?.amount && Number(compare.amount) > Number(price?.amount ?? 0) ? (
                                  <span className="text-[10px] text-neutral-400 line-through tabular-nums">
                                    {fmt(compare.amount, compare.currencyCode)}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <Link
                              href={`/products/${p.handle}`}
                              onClick={() => onOpenChange?.(false)}
                              className="shrink-0 inline-flex items-center justify-center h-7 px-3 rounded-full border border-neutral-300 text-[11px] font-medium text-neutral-600 hover:border-primary hover:text-primary transition-colors"
                            >
                              View
                            </Link>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="h-4" />
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        {lines.length > 0 && (
          <div
            className="shrink-0 border-t border-neutral-100 bg-white px-5 pt-4"
            style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))' }}
          >
            {/* Subtotal row */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] text-neutral-500">Subtotal</span>
              <span className="text-[15px] font-semibold tabular-nums text-neutral-900">
                {fmt(subtotal?.amount ?? 0, subtotal?.currencyCode ?? "INR")}
              </span>
            </div>

            {/* Checkout button */}
            <button
              id="checkoutButton"
              disabled={lines.length === 0 || !cart?.id || (!gokwikReady && !checkoutUrl)}
              onClick={startGoKwikCheckout}
              className="w-full h-14 flex items-center justify-center rounded-[12px] bg-primary text-white text-[15px] font-bold uppercase tracking-[0.15em] transition-all duration-300 active:scale-[0.98] shadow-sm hover:shadow-md hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
              title={!gokwikReady && checkoutUrl ? "Loading checkout…" : "Proceed to Checkout"}
            >
              Proceed to Checkout
            </button>

            <p className="text-[10px] text-neutral-400 text-center mt-2.5 leading-relaxed">
              Shipping and taxes calculated at checkout.
            </p>
          </div>
        )}

      </SheetContent>
    </Sheet>
  );
}

/* -------------------------------- Skeletons -------------------------------- */
function CartSkeleton() {
  return (
    <div className="flex gap-3 animate-pulse">
      <div className="h-[88px] w-[88px] rounded-lg bg-neutral-100 shrink-0" />
      <div className="flex-1 space-y-2.5 pt-0.5">
        <div className="h-3.5 w-4/5 bg-neutral-100 rounded" />
        <div className="h-3 w-2/5 bg-neutral-100 rounded" />
        <div className="pt-4 flex items-center justify-between">
          <div className="h-7 w-24 bg-neutral-100 rounded-full" />
          <div className="h-3.5 w-3.5 bg-neutral-100 rounded" />
        </div>
      </div>
    </div>
  );
}

function RecSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map(i => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="h-[60px] w-[60px] rounded-md bg-neutral-100 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-3/4 bg-neutral-100 rounded" />
            <div className="h-3 w-1/3 bg-neutral-100 rounded" />
          </div>
          <div className="h-7 w-14 rounded-full bg-neutral-100 shrink-0" />
        </div>
      ))}
    </div>
  );
}
