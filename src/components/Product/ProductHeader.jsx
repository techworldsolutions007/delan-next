'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
// src/components/Product/ProductHeader.jsx
// src/components/Product/ProductHeader.jsx
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { shopify } from "@/lib/shopify";

import { ChevronLeft, ChevronRight, Heart, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import SizeChartSlider from "./SizeChartSlider";
import CouponCarousel, { DEFAULT_COUPONS } from "./CouponCarousel";
import ProductImageModal from "./ProductImageModal";
import WhyLoveDescriptionCard from "./WhyLoveDescriptionCard";
import WhyLoveAndDetails from "./WhyLoveAndDetails";
import RelatedStyles from "./RelatedStyles";
import { releaseFocusForCheckout } from "@/lib/checkout-helpers";
const Cod = "/icons/cod.png";
const Return = "/icons/exchange.png";
const Secure = "/icons/secure.png";
const Delivery = "/icons/delivery-truck-outline.svg";
import {
  readWishlistIds,
  writeWishlistIds,
  emitWishlistEvent,
  WISHLIST_STORAGE_KEY,
} from "@/lib/wishlistStore";
import { isPreorder } from "@/lib/preorder";
import { trackAddToCart } from "@/lib/analytics";
/* ---------------- Shopify query (no Apollo) ---------------- */
const GET_PRODUCT_BY_HANDLE = `
  query getProductByHandle($handle: String!) {
    product(handle: $handle) {
      id
      title
      handle

      # ✅ BEST: Shopify "Search engine listing" fields
      seo { title description }

      # ✅ Fallback plain description
      description

      # kept for your UI usage
      descriptionHtml

      options(first: 10) {
        id
        name
        values
        optionValues { name swatch { color } }
      }
      featuredImage {
        url(transform: {maxWidth: 800})
        thumbUrl: url(transform: {maxWidth: 220})
        altText
      }
      images(first: 20) {
        edges {
          node {
            url(transform: {maxWidth: 800})
            thumbUrl: url(transform: {maxWidth: 220})
            altText
          }
        }
      }
      media(first: 10) {
        nodes {
          __typename
          alt
          mediaContentType
          previewImage { url(transform: {maxWidth: 2048}) }
          ... on Video {
            id
            sources {
              url
              mimeType
              format
              width
              height
            }
          }
          ... on ExternalVideo {
            id
            embedUrl
            host
          }
        }
      }
      variants(first: 50) {
        edges {
          node {
            id
            title
            availableForSale
            sku
            quantityAvailable
            image {
              url(transform: {maxWidth: 800})
              thumbUrl: url(transform: {maxWidth: 220})
              altText
            }
            price { amount currencyCode }
            compareAtPrice { amount currencyCode }
            selectedOptions { name value }
          }
        }
      }
      tags
      metafields(identifiers: [
        { namespace: "air_reviews_product", key: "data" },
        { namespace: "air_reviews_product", key: "review_avg" },
        { namespace: "air_reviews_product", key: "review_count" },
        { namespace: "custom", key: "sold_count" }
      ]) { key namespace type value }
      collections(first: 20) { edges { node { handle title } } }
    }
  }
`;

/* ----------------- Cart mutations (Create, Add) ----------------- */
const CART_CREATE = /* GraphQL */ `
  mutation CartCreate($lines: [CartLineInput!]) {
    cartCreate(input: { lines: $lines }) {
      cart { id totalQuantity checkoutUrl }
      userErrors { field message }
    }
  }
`;

const CART_LINES_ADD = /* GraphQL */ `
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { id totalQuantity checkoutUrl }
      userErrors { message field }
    }
  }
`;

/* ---------------- utils & helpers ---------------- */
const BRAND = "var(--brand-642, #642c44)";
const CART_ID_KEY = "shopifyCartId";
const WISHLIST_KEY = WISHLIST_STORAGE_KEY;

const SITE_BRAND_NAME = "DELAN"; // used ONLY when Shopify seo.title is empty
const ADD_TO_BAG_TRUST_BADGES = [
  { icon: Return, label: "7 Days Return / Exchanges" },
  { icon: Secure, label: "Secure Payments" },
  { icon: Cod, label: "Partial COD Accepted" },
  { icon: Delivery, label: "Delivers Across India" },
];

/* -------------------------------------------------------------------------- */
/*                               GoKwik Helpers                               */
/* -------------------------------------------------------------------------- */
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

const first = (arr) => (Array.isArray(arr) && arr.length ? arr[0] : undefined);
const edgeNodes = (edges = []) => edges.map((e) => e?.node).filter(Boolean);

const isColorOption = (name = "") => {
  const n = String(name).toLowerCase();
  return n.includes("color") || n.includes("colour");
};
const isSizeOptionName = (name = "") => String(name || "").trim().toLowerCase().includes("size");
const looksLikeCssColor = (v = "") => {
  const s = String(v || "").trim();
  return !!s && (s.startsWith("#") || s.startsWith("rgb(") || s.startsWith("hsl(") || /^[a-zA-Z]+$/.test(s));
};

function formatMoney(amount) {
  const n = Number(amount ?? 0);
  return `Rs. ${n.toLocaleString("en-IN")}`;
}

function pickVariant(product, selectedOptions) {
  const edges = product?.variants?.edges || [];
  for (const e of edges) {
    const v = e?.node;
    if (!v) continue;
    const ok = (v.selectedOptions || []).every((o) => selectedOptions?.[o?.name] === o?.value);
    if (ok) return v;
  }
  return null;
}

/* ---------------- SEO helpers ---------------- */
function stripHtmlToText(html = "") {
  if (!html) return "";
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return (doc.body?.textContent || "").replace(/\s+/g, " ").trim();
  } catch {
    return String(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
}
function clampText(str = "", max = 160) {
  const s = String(str || "").replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
}
function upsertMetaByName(name, content) {
  if (typeof document === "undefined") return;
  const value = String(content || "").trim();
  if (!value) return;
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}
function upsertMetaByProperty(property, content) {
  if (typeof document === "undefined") return;
  const value = String(content || "").trim();
  if (!value) return;
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}
function upsertLink(rel, href) {
  if (typeof document === "undefined") return;
  const value = String(href || "").trim();
  if (!value) return;
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", value);
}

/* --------------------- helpers for Cart + Wishlist --------------------- */
const getStoredCartId = () => { try { return localStorage.getItem(CART_ID_KEY) || null; } catch { return null; } };
const setStoredCartId = (id) => { try { localStorage.setItem(CART_ID_KEY, id); } catch { } };
const clearStoredCartId = () => { try { localStorage.removeItem(CART_ID_KEY); } catch { } };
function emitCartQty(qty) { try { window.dispatchEvent(new CustomEvent("cart:updated", { detail: { totalQuantity: qty ?? 0 } })); } catch { } }
function readWishlist() { return readWishlistIds(); }
function writeWishlist(ids = []) { writeWishlistIds(ids); }

/* ------------------------------------------------------------------ */
export default function ProductHeader({ handle: handleProp, onAddToCart, onCtaChange, onReviewStateChange, onProductLoaded }) {
  const { handle: handleFromRoute } = useParams();
  const handle = handleProp ?? handleFromRoute;

  // responsive (<= 1023px = mobile+tablet)
  const [isSmallViewport, setIsSmallViewport] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 1023px)").matches : true
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 1023px)");
    const onChange = (e) => setIsSmallViewport(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // tablet viewport (1024px–1279px): click-to-open modal, no nav arrows
  const [isTabletViewport, setIsTabletViewport] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px) and (max-width: 1279px)").matches : false
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px) and (max-width: 1279px)");
    const onChange = (e) => setIsTabletViewport(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  const isMobileOrTablet = isSmallViewport || isTabletViewport;

  // data + UI state
  const [product, setProduct] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [isSizeChartOpen, setIsSizeChartOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [gokwikReady, setGokwikReady] = useState(false);

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
      s.onerror = () => setGokwikReady(false);
      document.body.appendChild(s);
    } else {
      setGokwikReady(Boolean(window.triggerGokwikCustomCheckout || window.gokwikSdk));
    }
  }, []);

  const triggerGokwikOrFallback = useCallback(
    async (cartId, maybeCheckoutUrl) => {
      releaseFocusForCheckout();
      if (GOKWIK_ENABLED && GOKWIK_MID && typeof window.triggerGokwikCheckout === "function") {
        try {
          window.triggerGokwikCheckout(cartId);
          return;
        } catch { }
      }

      if (maybeCheckoutUrl) {
        window.open(maybeCheckoutUrl, "_blank", "noopener,noreferrer");
        return;
      }
      window.open("/cart", "_blank", "noopener,noreferrer");
    },
    []
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fitType, setFitType] = useState(null);
  const [sizeNeedsSelection, setSizeNeedsSelection] = useState(false);
  const sizeSectionRef = useRef(null);

  const normalizedFit = useMemo(() => {
    if (!fitType) return null;
    const f = fitType.toLowerCase();
    if (f.includes("oversized")) return "Oversized";
    if (f.includes("regular")) return "Regular";
    return null;
  }, [fitType]);

  const fitGuidance = useMemo(() => {
    if (!normalizedFit) return null;
    if (normalizedFit === "Oversized") return "For a more regular fit, choose one size smaller.";
    if (normalizedFit === "Regular") return "Designed for a regular fit. Choose your usual size.";
    return null;
  }, [normalizedFit]);

  const [relatedProducts, setRelatedProducts] = useState([]);

  const isExpressShipping = useMemo(() => {
    if (!product) return false;
    const collectionHandles = (product.collections?.edges || []).map(
      ({ node }) => (node?.handle || "").toLowerCase().trim()
    );
    const productTags = (product.tags || []).map(
      (t) => (t || "").toLowerCase().trim().replace(/[\s_]+/g, "-")
    );
    const expressCollections = ["express-collection"];
    const expressTags = ["express-collection", "express", "ready-to-ship", "ships-in-one-day", "1-day-delivery"];
    return (
      collectionHandles.some((h) => expressCollections.includes(h)) ||
      productTags.some((t) => expressTags.includes(t))
    );
  }, [product]);

  const shippingMessage = useMemo(() => {
    if (!product) return null;
    const collectionHandles = (product.collections?.edges || []).map(
      ({ node }) => (node?.handle || "").toLowerCase().trim()
    );
    if (
      collectionHandles.includes("winter-festive") ||
      collectionHandles.includes("first-love-yourself")
    ) return "Dispatches within 1 week";
    if (collectionHandles.includes("summer-somewhere")) return "Dispatches within 2 weeks";
    return null;
  }, [product]);

  // gallery state
  const [activeImg, setActiveImg] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setImageLoaded(false);
  }, [activeImg, product?.id]);

  const containerRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [hoverSide, setHoverSide] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [bgPos, setBgPos] = useState({ x: "50%", y: "50%" });
  const [zoomPreviewLayout, setZoomPreviewLayout] = useState(null);
  const ZOOM_LEVEL = 3;

  const [canScrollThumbTop, setCanScrollThumbTop] = useState(false);
  const [canScrollThumbBottom, setCanScrollThumbBottom] = useState(false);

  const checkThumbScroll = useCallback(() => {
    const el = thumbTrackRef.current;
    if (!el) return;
    setCanScrollThumbTop(el.scrollTop > 5);
    setCanScrollThumbBottom(el.scrollTop + el.clientHeight < el.scrollHeight - 5);
  }, []);

  useEffect(() => {
    const el = thumbTrackRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkThumbScroll, { passive: true });
    checkThumbScroll();
    const timer = setTimeout(checkThumbScroll, 600);
    return () => {
      el.removeEventListener("scroll", checkThumbScroll);
      clearTimeout(timer);
    };
  }, [checkThumbScroll, product?.images?.edges?.length]);



  // thumbnails: drag + click
  const thumbTrackRef = useRef(null);
  const pointerIdRef = useRef(null);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const didDragRef = useRef(false);
  const didCaptureRef = useRef(false);
  const skipClickUntilTSRef = useRef(0);
  const mainImageSwipeRef = useRef({
    pointerId: null,
    touchId: null,
    startX: 0,
    startY: 0,
    swipedUntil: 0,
  });

  // fetch product
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!handle) return;
      setLoading(true);
      setErr("");
      setFitType(null);
      try {
        const data = await shopify(GET_PRODUCT_BY_HANDLE, { handle });
        const p = data?.product || null;
        if (!p || cancelled) return;

        // Build a set of available variant option-value combos for fast lookup
        const variants = (p.variants?.edges || []).map((e) => e?.node).filter(Boolean);

        const defaults = {};
        (p.options || []).forEach((opt) => {
          const vals = (opt.optionValues?.map((v) => v?.name).filter(Boolean)) || (opt.values || []);
          // Pick the first value whose variant is available for sale; fall back to nothing selected
          const firstAvailable = vals.find((val) =>
            variants.some((v) => {
              const opts = Object.fromEntries((v.selectedOptions || []).map((o) => [o.name, o.value]));
              return String(opts[opt.name] || "").toLowerCase() === String(val).toLowerCase() && v.availableForSale && (v.quantityAvailable == null || v.quantityAvailable > 0);
            })
          );
          // Keep size intentionally unselected so the shopper chooses it manually.
          if (opt?.name && firstAvailable && !isSizeOptionName(opt.name)) defaults[opt.name] = firstAvailable;
        });

        setProduct(p);
        // Only set fitType if we actually got a value (don't override with null)
        if (p?.fitType?.value) setFitType(p.fitType.value);
        setSelectedOptions(defaults);
        setSelectedVariant(pickVariant(p, defaults) || null);
        setActiveImg(0);
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Failed to load product");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [handle]);

  // Dedicated fetch for fit_type metafield as a fallback
  useEffect(() => {
    if (!handle) return;
    let cancelled = false;
    (async () => {
      try {
        const FIT_TYPE_QUERY = `
          query getFitType($handle: String!) {
            product(handle: $handle) {
              fitType: metafield(namespace: "custom", key: "fit_type") {
                value
              }
            }
          }
        `;
        const data = await shopify(FIT_TYPE_QUERY, { handle });
        const val = data?.product?.fitType?.value;
        if (!cancelled && val) setFitType(val);
      } catch { /* silent fallback */ }
    })();
    return () => { cancelled = true; };
  }, [handle]);

  // Dedicated fetch for related styles (list.product_reference metafield)
  useEffect(() => {
    if (!handle) return;
    let cancelled = false;
    (async () => {
      try {
        const RELATED_STYLES_QUERY = `
          query getRelatedStyles($handle: String!) {
            product(handle: $handle) {
              metafield(namespace: "custom", key: "related_styles") {
                references(first: 5) {
                  nodes {
                    ... on Product {
                      id
                      title
                      handle
                      featuredImage { url altText }
                      priceRange { minVariantPrice { amount currencyCode } }
                    }
                  }
                }
              }
            }
          }
        `;
        const data = await shopify(RELATED_STYLES_QUERY, { handle });
        const nodes = data?.product?.metafield?.references?.nodes ?? [];
        if (!cancelled) setRelatedProducts(nodes);
      } catch { /* silent — feature is non-critical */ }
    })();
    return () => { cancelled = true; };
  }, [handle]);

  useEffect(() => {
    if (!product) return;
    const v = pickVariant(product, selectedOptions);
    setSelectedVariant(v || null);
  }, [product, selectedOptions]);

  const sizeOptionName = useMemo(
    () => (product?.options || []).find((opt) => isSizeOptionName(opt?.name))?.name || "",
    [product?.options]
  );
  const selectedSize = sizeOptionName ? selectedOptions[sizeOptionName] : "";

  useEffect(() => {
    if (selectedSize) setSizeNeedsSelection(false);
  }, [selectedSize]);

  const focusSizeSelection = useCallback(() => {
    setSizeNeedsSelection(true);
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      const el = sizeSectionRef.current;
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus?.({ preventScroll: true });
    });
  }, []);

  useEffect(() => {
    const pid = product?.id ? String(product.id) : null;
    if (!pid) {
      setWishlisted(false);
      return;
    }
    const ids = readWishlist();
    setWishlisted(ids.includes(pid));
  }, [product?.id]);

  useEffect(() => {
    const onWishlistUpdated = () => {
      const pid = product?.id ? String(product.id) : null;
      if (!pid) return;
      const ids = readWishlist();
      setWishlisted(ids.includes(pid));
    };
    const onStorage = (ev) => {
      if (ev.key !== WISHLIST_KEY) return;
      onWishlistUpdated();
    };
    window.addEventListener("wishlist:updated", onWishlistUpdated);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("wishlist:updated", onWishlistUpdated);
      window.removeEventListener("storage", onStorage);
    };
  }, [product?.id]);

  // gallery helpers
  const galleryImages = edgeNodes(product?.images?.edges);



  // desktop zoom/hover handlers
  const updateZoomPreviewLayout = useCallback(() => {
    if (isSmallViewport || isTabletViewport || typeof window === "undefined") return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const previewWidth = Math.max(320, Math.min(420, Math.round(viewportWidth * 0.26)));
    const previewHeight = Math.round(previewWidth * 1.25);
    const gap = 24;
    const edgePadding = 24;
    const headerBottom = Math.max(
      0,
      document.querySelector("header")?.getBoundingClientRect?.().bottom || 0
    );
    const minTop = Math.max(edgePadding, headerBottom + edgePadding);

    const rightSideLeft = rect.right + gap;
    const leftSideLeft = rect.left - previewWidth - gap;

    let left = rightSideLeft;
    if (rightSideLeft + previewWidth > viewportWidth - edgePadding) {
      left = leftSideLeft >= edgePadding
        ? leftSideLeft
        : viewportWidth - previewWidth - edgePadding;
    }

    const preferredTop = rect.top + (rect.height - previewHeight) / 2;
    const maxTop = Math.max(minTop, viewportHeight - previewHeight - edgePadding);
    const top = Math.min(Math.max(preferredTop, minTop), maxTop);

    setZoomPreviewLayout({
      left: `${Math.max(edgePadding, left)}px`,
      top: `${top}px`,
      width: `${previewWidth}px`,
      height: `${previewHeight}px`,
    });
  }, [isSmallViewport, isTabletViewport]);

  useEffect(() => {
    if (isSmallViewport || isTabletViewport || !isZoomed) return;

    const syncZoomPreviewLayout = () => updateZoomPreviewLayout();
    syncZoomPreviewLayout();

    window.addEventListener("resize", syncZoomPreviewLayout);
    window.addEventListener("scroll", syncZoomPreviewLayout, { passive: true });

    return () => {
      window.removeEventListener("resize", syncZoomPreviewLayout);
      window.removeEventListener("scroll", syncZoomPreviewLayout);
    };
  }, [isSmallViewport, isTabletViewport, isZoomed, updateZoomPreviewLayout]);

  function handleMouseMove(e) {
    if (isSmallViewport || isTabletViewport) return;
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const percentX = (x / rect.width) * 100;
    const percentY = (y / rect.height) * 100;

    setCursorPos({ x: e.clientX, y: e.clientY });
    setHoverSide(percentX < 50 ? "left" : "right");
    setBgPos({
      x: `${Math.max(0, Math.min(100, percentX))}%`,
      y: `${Math.max(0, Math.min(100, percentY))}%`,
    });
    updateZoomPreviewLayout();
  }

  /* ---------- Derived values placed BEFORE any early returns ---------- */
  const reviewMf = (product?.metafields || []).find(m => m?.namespace === "air_reviews_product" && m?.key === "data");
  let approvedReviews = [];
  try {
    approvedReviews = reviewMf?.value ? (JSON.parse(reviewMf.value)?.reviews || []).filter((r) => r?.status === "approved") : [];
  } catch { }
  const totalReviews = approvedReviews.length;

  const variantEdges = product?.variants?.edges || [];
  const productHasStock = variantEdges.some(({ node }) =>
    node?.availableForSale && (node.quantityAvailable == null || node.quantityAvailable > 0)
  );
  const price = selectedVariant?.price?.amount ?? first(product?.variants?.edges)?.node?.price?.amount ?? "0";
  const compareAt = selectedVariant?.compareAtPrice?.amount ?? first(product?.variants?.edges)?.node?.compareAtPrice?.amount;
  const inStock = Boolean(
    selectedVariant?.availableForSale &&
    (selectedVariant?.quantityAvailable == null || selectedVariant?.quantityAvailable > 0)
  );
  const canAttemptAdd = selectedVariant?.id ? inStock : productHasStock;
  const isAddToBagDisabled = !canAttemptAdd || adding;
  const addToBagLabel = canAttemptAdd ? (adding ? "ADDING..." : "ADD TO BAG") : "SOLD OUT";

  const variantThumb = selectedVariant?.image?.url;
  const galleryThumb = galleryImages?.[0]?.url;
  const popupThumb = variantThumb || galleryThumb || "";

  const zoomPreview =
    !isSmallViewport && !isTabletViewport &&
      isZoomed &&
      zoomPreviewLayout &&
      galleryImages[activeImg]?.url &&
      typeof document !== "undefined"
      ? createPortal(
        <div
          aria-hidden
          className="fixed z-[49] overflow-hidden rounded-lg border border-black/10 bg-white shadow-2xl pointer-events-none"
          style={{
            ...zoomPreviewLayout,
            backgroundImage: `url(${galleryImages[activeImg].url})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: `${ZOOM_LEVEL * 100}%`,
            backgroundPosition: `${bgPos.x} ${bgPos.y}`,
          }}
        />,
        document.body
      )
      : null;

  /* ---------------- BEST SEO (Shopify seo first, fallback to product) ---------------- */
  const seo = useMemo(() => {
    const titleFromShopifySEO = product?.seo?.title?.trim();
    const descFromShopifySEO = product?.seo?.description?.trim();

    const fallbackTitle = product?.title ? `${product.title} | ${SITE_BRAND_NAME}` : SITE_BRAND_NAME;

    const rawDesc =
      descFromShopifySEO ||
      product?.description ||
      stripHtmlToText(product?.descriptionHtml || "");

    const origin = typeof window !== "undefined" ? window.location.origin : "https://delan.in";
    const canonical = handle
      ? `${origin}/products/${handle}`
      : typeof window !== "undefined" ? window.location.href : `${origin}/products`;

    const image = popupThumb || "";

    return {
      title: titleFromShopifySEO || fallbackTitle,
      description: clampText(rawDesc, 160),
      canonical,
      image,
      plainTitleForUI: product?.title || "",
    };
  }, [product?.seo?.title, product?.seo?.description, product?.title, product?.description, product?.descriptionHtml, handle, popupThumb]);

  // ✅ apply to <head>
  useEffect(() => {
    if (!seo.title) return;

    document.title = seo.title;

    // meta description
    if (seo.description) upsertMetaByName("description", seo.description);

    // canonical
    upsertLink("canonical", seo.canonical);

    // OG
    upsertMetaByProperty("og:type", "product");
    upsertMetaByProperty("og:title", seo.title);
    upsertMetaByProperty("og:description", seo.description);
    upsertMetaByProperty("og:url", seo.canonical);
    if (seo.image) upsertMetaByProperty("og:image", seo.image);

    // Twitter
    upsertMetaByName("twitter:card", seo.image ? "summary_large_image" : "summary");
    upsertMetaByName("twitter:title", seo.title);
    upsertMetaByName("twitter:description", seo.description);
    if (seo.image) upsertMetaByName("twitter:image", seo.image);
  }, [seo.title, seo.description, seo.canonical, seo.image]);

  // 🔑 CTA info effect MUST be declared before any conditional return
  useEffect(() => {
    if (typeof onReviewStateChange === "function") {
      onReviewStateChange(totalReviews > 0);
    }
  }, [totalReviews, onReviewStateChange]);

  /* ------------------ cart helpers ------------------ */
  const createCart = useCallback(async () => {
    const res = await shopify(CART_CREATE);
    const errs = res?.cartCreate?.userErrors;
    if (errs?.length) throw new Error(errs.map(e => e.message).join("; "));
    const id = res?.cartCreate?.cart?.id;
    if (!id) throw new Error("Unable to create cart.");
    setStoredCartId(id);
    return id;
  }, []);

  const ensureCart = useCallback(async () => {
    let id = getStoredCartId();
    if (!id) id = await createCart();
    return id;
  }, [createCart]);

  const doCartLinesAdd = useCallback(
    async (variantId, qty, skipOpen = false) => {
      let cartId = await ensureCart();

      const tryAdd = async (id) => {
        const res = await shopify(CART_LINES_ADD, {
          cartId: id,
          lines: [{ merchandiseId: variantId, quantity: qty }],
        });
        const errs = res?.cartLinesAdd?.userErrors;
        return { res, errs };
      };

      let { res, errs } = await tryAdd(cartId);

      if (errs?.length) {
        const msg = (errs.map(e => e?.message || "").join(" ")).toLowerCase();
        if (msg.includes("not found") || msg.includes("does not exist") || msg.includes("invalid")) {
          clearStoredCartId();
          cartId = await createCart();
          ({ res, errs } = await tryAdd(cartId));
        }
      }

      if (errs?.length) throw new Error(errs.map((e) => e.message).join("; "));

      const cartData = res?.cartLinesAdd?.cart;
      const totalQty = cartData?.totalQuantity ?? 0;
      emitCartQty(totalQty);
      if (!skipOpen) {
        try { window.dispatchEvent(new CustomEvent("cart:open")); } catch { }
      }
      return cartData?.checkoutUrl;
    },
    [ensureCart, createCart]
  );

  const handleAdd = useCallback(async () => {
    if (sizeOptionName && !selectedSize) {
      focusSizeSelection();
      return;
    }

    if (!selectedVariant?.id) {
      alert("Please select an available option.");
      return;
    }

    try {
      setAdding(true);

      if (typeof onAddToCart === "function") {
        await onAddToCart(selectedVariant.id, 1);
      } else {
        await doCartLinesAdd(selectedVariant.id, 1);
      }

      // ✅ Google Ads Add To Cart conversion
      if (window.gtag_add_to_cart_conversion) {
        window.gtag_add_to_cart_conversion();
      }

      trackAddToCart({
        productGid: product?.id,
        variantGid: selectedVariant?.id,
        productTitle: product?.title,
        variantTitle: selectedVariant?.title,
        price: selectedVariant?.price?.amount ?? '0',
        cartId: getStoredCartId() ?? '',
        quantity: 1,
      });

      // Dispatch event for other components to listen
      try { window.dispatchEvent(new CustomEvent("cart:item-added")); } catch { }

    } catch (e) {
      alert(e?.message || "Could not add to cart.");
    } finally {
      setAdding(false);
    }
  }, [
    selectedVariant?.id,
    selectedSize,
    sizeOptionName,
    focusSizeSelection,
    onAddToCart,
    doCartLinesAdd
  ]);

  const handleBuyNow = useCallback(async () => {
    if (sizeOptionName && !selectedSize) {
      focusSizeSelection();
      return;
    }

    if (!selectedVariant?.id) {
      alert("Please select an available option.");
      return;
    }

    setBuying(true);
    try {
      let cartId = localStorage.getItem(CART_ID_KEY);
      let checkoutUrl = null;

      if (!cartId) {
        const res = await shopify(CART_CREATE, {
          lines: [{ merchandiseId: selectedVariant.id, quantity: 1 }],
        });
        const errs = res?.cartCreate?.userErrors;
        if (errs?.length) throw new Error(errs[0].message);
        cartId = res?.cartCreate?.cart?.id;
        checkoutUrl = res?.cartCreate?.cart?.checkoutUrl;
        if (cartId) localStorage.setItem(CART_ID_KEY, cartId);

        const total = res?.cartCreate?.cart?.totalQuantity ?? 1;
        emitCartQty(total);
      } else {
        checkoutUrl = await doCartLinesAdd(selectedVariant.id, 1, true);
      }

      try { window.dispatchEvent(new CustomEvent("cart:item-added")); } catch { }

      await triggerGokwikOrFallback(cartId, checkoutUrl);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Could not proceed to checkout");
    } finally {
      setBuying(false);
    }
  }, [
    selectedVariant?.id,
    selectedSize,
    sizeOptionName,
    focusSizeSelection,
    doCartLinesAdd,
    triggerGokwikOrFallback
  ]);

  useEffect(() => {
    if (typeof onCtaChange === "function") {
      onCtaChange({
        title: seo.plainTitleForUI || "",
        priceLabel: formatMoney(price),
        imageUrl: popupThumb || "",
        inStock: canAttemptAdd,
        adding,
        onAdd: handleAdd,
        buying,
        onBuyNow: handleBuyNow,
        isPreorder: false,
      });
    }
  }, [seo.plainTitleForUI, price, popupThumb, canAttemptAdd, adding, handleAdd, buying, handleBuyNow, onCtaChange, product]);

  // Expose product data + cart helper to parent (for UGC video popup)
  useEffect(() => {
    if (product && typeof onProductLoaded === "function") {
      onProductLoaded(product, doCartLinesAdd);
    }
  }, [product, onProductLoaded, doCartLinesAdd]);



  const toggleWishlist = useCallback(() => {
    if (!product?.id) return;
    const pid = String(product.id);
    const ids = readWishlist();
    const exists = ids.includes(pid);
    const next = exists ? ids.filter((x) => x !== pid) : [...ids, pid];
    writeWishlist(next);
    setWishlisted(!exists);
    emitWishlistEvent({ ids: next, added: !exists ? pid : null, removed: exists ? pid : null });
  }, [product?.id]);

  /* ---------- Thumbnails: drag AFTER slop; clicks still work ---------- */
  const DRAG_SLOP = 6;
  const CLICK_SUPPRESS_MS = 180;

  const onThumbPointerDown = useCallback((e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const track = thumbTrackRef.current;
    if (!track) return;
    pointerIdRef.current = e.pointerId;
    startXRef.current = e.clientX;
    startScrollLeftRef.current = track.scrollLeft;
    didDragRef.current = false;
    didCaptureRef.current = false;
  }, []);

  const onThumbPointerMove = useCallback((e) => {
    const track = thumbTrackRef.current;
    if (!track) return;
    if (pointerIdRef.current == null || e.pointerId !== pointerIdRef.current) return;

    const dx = e.clientX - startXRef.current;
    if (!didDragRef.current && Math.abs(dx) > DRAG_SLOP) {
      didDragRef.current = true;
      try {
        track.setPointerCapture?.(e.pointerId);
        didCaptureRef.current = true;
      } catch { }
    }

    if (didDragRef.current) {
      if (e.cancelable) e.preventDefault();
      track.scrollLeft = startScrollLeftRef.current - dx;
    }
  }, []);

  const onThumbPointerUpOrCancel = useCallback((e) => {
    const track = thumbTrackRef.current;
    if (!track) return;
    if (pointerIdRef.current == null || e.pointerId !== pointerIdRef.current) return;

    if (didCaptureRef.current) {
      try { track.releasePointerCapture?.(e.pointerId); } catch { }
    }

    if (didDragRef.current) {
      skipClickUntilTSRef.current = Date.now() + CLICK_SUPPRESS_MS;
    }

    pointerIdRef.current = null;
    didDragRef.current = false;
    didCaptureRef.current = false;
  }, []);

  const onThumbClick = useCallback((index) => {
    if (Date.now() < skipClickUntilTSRef.current) return;
    setActiveImg(index);
  }, []);

  const showGalleryPrev = useCallback(() => {
    const count = galleryImages.length;
    if (count < 2) return;
    setActiveImg((p) => (p - 1 + count) % count);
  }, [galleryImages.length]);

  const showGalleryNext = useCallback(() => {
    const count = galleryImages.length;
    if (count < 2) return;
    setActiveImg((p) => (p + 1) % count);
  }, [galleryImages.length]);

  const onMainImagePointerDown = useCallback((e) => {
    if (!(isSmallViewport || isTabletViewport) || galleryImages.length < 2) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    mainImageSwipeRef.current.pointerId = e.pointerId;
    mainImageSwipeRef.current.startX = e.clientX;
    mainImageSwipeRef.current.startY = e.clientY;
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { }
  }, [galleryImages.length, isSmallViewport, isTabletViewport]);

  const onMainImagePointerMove = useCallback((e) => {
    const state = mainImageSwipeRef.current;
    if (!(isSmallViewport || isTabletViewport) || state.pointerId !== e.pointerId) return;

    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absX > 12 && absX > absY * 1.15 && e.cancelable) {
      e.preventDefault();
    }
  }, [isSmallViewport, isTabletViewport]);

  const onMainImagePointerUp = useCallback((e) => {
    const state = mainImageSwipeRef.current;
    if (!(isSmallViewport || isTabletViewport) || state.pointerId !== e.pointerId) return;

    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    state.pointerId = null;
    try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch { }

    if (absX < 36 || absX < absY * 1.15) return;

    state.swipedUntil = Date.now() + 250;
    if (dx < 0) showGalleryNext();
    else showGalleryPrev();
  }, [isSmallViewport, isTabletViewport, showGalleryNext, showGalleryPrev]);

  const onMainImagePointerCancel = useCallback(() => {
    mainImageSwipeRef.current.pointerId = null;
  }, []);

  const onMainImageTouchStart = useCallback((e) => {
    if (typeof window !== "undefined" && window.PointerEvent) return;
    if (!(isSmallViewport || isTabletViewport) || galleryImages.length < 2 || !e.touches?.length) return;
    const touch = e.touches[0];
    mainImageSwipeRef.current.touchId = touch.identifier;
    mainImageSwipeRef.current.startX = touch.clientX;
    mainImageSwipeRef.current.startY = touch.clientY;
  }, [galleryImages.length, isSmallViewport, isTabletViewport]);

  const onMainImageTouchMove = useCallback((e) => {
    if (typeof window !== "undefined" && window.PointerEvent) return;
    const state = mainImageSwipeRef.current;
    if (!(isSmallViewport || isTabletViewport) || state.touchId == null) return;
    const touch = Array.from(e.touches || []).find((t) => t.identifier === state.touchId);
    if (!touch) return;

    const dx = touch.clientX - state.startX;
    const dy = touch.clientY - state.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absX > 12 && absX > absY * 1.15 && e.cancelable) {
      e.preventDefault();
    }
  }, [isSmallViewport, isTabletViewport]);

  const onMainImageTouchEnd = useCallback((e) => {
    if (typeof window !== "undefined" && window.PointerEvent) return;
    const state = mainImageSwipeRef.current;
    if (!(isSmallViewport || isTabletViewport) || state.touchId == null) return;
    const touch = Array.from(e.changedTouches || []).find((t) => t.identifier === state.touchId);
    if (!touch) return;

    const dx = touch.clientX - state.startX;
    const dy = touch.clientY - state.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    state.touchId = null;

    if (absX < 36 || absX < absY * 1.15) return;

    state.swipedUntil = Date.now() + 250;
    if (dx < 0) showGalleryNext();
    else showGalleryPrev();
  }, [isSmallViewport, isTabletViewport, showGalleryNext, showGalleryPrev]);

  const onMainImageTouchCancel = useCallback(() => {
    mainImageSwipeRef.current.touchId = null;
  }, []);

  const onMainImageClick = useCallback(() => {
    if (Date.now() < mainImageSwipeRef.current.swipedUntil) return;
    setIsModalOpen(true);
  }, []);

  /* ------------------ loading / error UI ------------------ */
  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-16" style={{ minHeight: '100vh' }}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="aspect-[3/4] w-full rounded-lg bg-muted animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
            <div className="h-12 w-full rounded bg-muted animate-pulse" />
            <div className="h-12 w-full rounded bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    );
  }
  if (err || !product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center text-muted-foreground">
        {err || "Product not found"}
      </div>
    );
  }

  return (
    <>
      {zoomPreview}
      <section
        id="product-header"
        className={`mx-auto max-w-7xl px-4 pt-4 pb-6 sm:pt-6 sm:pb-10 ${isSmallViewport ? "pb-5" : ""}`}
      >



        <div className="grid grid-cols-1 gap-10 lg:gap-14 lg:grid-cols-[1.1fr_0.9fr] md:items-start">
          {/* LEFT: Image gallery */}
          <div className="md:pl-2 min-w-0 overflow-hidden lg:sticky lg:top-8 lg:self-start flex flex-col-reverse md:flex-row gap-4">
            {/* Thumbnails Track */}
            {galleryImages.length > 0 && (
              <div
                className="relative shrink-0 w-full md:w-[76px]"
              >
                <div
                  ref={thumbTrackRef}
                  className="flex flex-row md:flex-col gap-3 overflow-x-auto md:overflow-y-auto no-scrollbar py-1 md:py-2 px-1 md:px-0 select-none cursor-grab active:cursor-grabbing w-full"
                  style={{
                    maxHeight: isSmallViewport ? "none" : "min(75vh, 650px)",
                    scrollBehavior: "smooth"
                  }}
                  onPointerDown={onThumbPointerDown}
                  onPointerMove={onThumbPointerMove}
                  onPointerUp={onThumbPointerUpOrCancel}
                  onPointerCancel={onThumbPointerUpOrCancel}
                >
                  {galleryImages.map((img, i) => (
                    <button
                      key={img.url + i}
                      type="button"
                      onClick={() => onThumbClick(i)}
                      aria-pressed={activeImg === i}
                      className={[
                        "relative inline-flex flex-none items-center justify-center",
                        "w-[68px] md:w-full aspect-[3/4] rounded-sm overflow-hidden border transition-all duration-300",
                        activeImg === i
                          ? "z-10 shadow-sm"
                          : "border-transparent",
                      ].join(" ")}
                      style={{
                        WebkitTapHighlightColor: "transparent",
                        borderColor: activeImg === i ? BRAND : undefined
                      }}
                      draggable={false}
                    >
                      <Image
                        src={img.thumbUrl || img.url}
                        alt={img.altText || `${product.title} thumb ${i + 1}`}
                        fill
                        className="object-cover pointer-events-none select-none"
                        draggable={false}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Main image container */}
            <div
              ref={containerRef}
              className={`flex-1 overflow-hidden relative flex justify-center items-center bg-neutral-50/50 rounded-sm ${isMobileOrTablet ? "" : "cursor-none"}`}
              style={{
                touchAction: isMobileOrTablet ? "pan-y" : "none",
                aspectRatio: "3/4"
              }}
              onMouseEnter={!isMobileOrTablet ? () => {
                updateZoomPreviewLayout();
                setIsHovered(true);
                setIsZoomed(true);
              } : undefined}
              onMouseLeave={!isMobileOrTablet ? () => {
                setIsHovered(false);
                setIsZoomed(false);
                setHoverSide(null);
                setZoomPreviewLayout(null);
              } : undefined}
              onMouseMove={!isMobileOrTablet ? handleMouseMove : undefined}
            >
              {/* Skeleton shimmer while loading */}
              {!imageLoaded && (
                <div className="absolute inset-0 z-10 skeleton" />
              )}

              {/* Desktop Navigation Arrows */}
              {!isMobileOrTablet && galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      showGalleryPrev();
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-black/10 hover:bg-black/30 text-white rounded-full transition-all z-20 group backdrop-blur-[2px]"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      showGalleryNext();
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-black/10 hover:bg-black/30 text-white rounded-full transition-all z-20 group backdrop-blur-[2px]"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </>
              )}

              {/* Mobile Pagination Dots */}
              {isSmallViewport && galleryImages.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 px-2 py-1 rounded-full">
                  {galleryImages.map((_, i) => (
                    <div
                      key={i}
                      className={`transition-all duration-300 h-1.5 rounded-full ${activeImg === i
                          ? "w-5 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
                          : "w-1.5 bg-white/50 backdrop-blur-[1px]"
                        }`}
                    />
                  ))}
                </div>
              )}

              {isMobileOrTablet ? (
                <div
                  className="relative w-full h-full cursor-pointer select-none"
                  onClick={onMainImageClick}
                  onPointerDown={onMainImagePointerDown}
                  onPointerMove={onMainImagePointerMove}
                  onPointerUp={onMainImagePointerUp}
                  onPointerCancel={onMainImagePointerCancel}
                  onTouchStart={onMainImageTouchStart}
                  onTouchMove={onMainImageTouchMove}
                  onTouchEnd={onMainImageTouchEnd}
                  onTouchCancel={onMainImageTouchCancel}
                  style={{ touchAction: "pan-y" }}
                >
                  <Image
                    src={galleryImages[activeImg]?.url}
                    alt={galleryImages[activeImg]?.altText || `${product.title} ${activeImg + 1}`}
                    fill
                    className="object-cover"
                    priority
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    onLoad={() => setImageLoaded(true)}
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                  />
                </div>
              ) : (
                <Image
                  src={galleryImages[activeImg]?.url}
                  alt={galleryImages[activeImg]?.altText || `${product.title} ${activeImg + 1}`}
                  fill
                  className="object-cover"
                  style={{ pointerEvents: "none" }}
                  priority
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  onLoad={() => setImageLoaded(true)}
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                />
              )}

              {/* Floating cursor hint (desktop only) */}
              {!isMobileOrTablet && isHovered && (
                <div
                  className="fixed pointer-events-none z-50 transition-transform duration-100 ease-out"
                  style={{ left: `${cursorPos.x}px`, top: `${cursorPos.y}px`, transform: "translate(-50%, -50%)" }}
                >
                  <div className="bg-white/90 backdrop-blur-md rounded-full shadow-md p-2">
                    {hoverSide === "left" ? <ChevronLeft className="w-6 h-6 text-primary" /> : <ChevronRight className="w-6 h-6 text-primary" />}
                  </div>
                </div>
              )}

              {/* Desktop: invisible half-click zones */}
              {!isMobileOrTablet && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveImg((p) => (p - 1 + galleryImages.length) % galleryImages.length)}
                    aria-label="Previous image"
                    className="absolute left-0 top-0 h-full w-1/2 bg-transparent focus:outline-none z-20 cursor-none"
                  />
                  <button
                    type="button"
                    onClick={() => setActiveImg((p) => (p + 1) % (galleryImages.length))}
                    aria-label="Next image"
                    className="absolute left-1/2 top-0 h-full w-1/2 bg-transparent focus:outline-none z-20 cursor-none"
                  />
                </>
              )}
            </div>
          </div>

          {/* RIGHT: Info & actions */}
          <div className="md:pr-2 min-w-0 self-start">
            <section className="space-y-5 sm:space-y-6 min-w-0">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl leading-snug  tracking-[.025em] uppercase text-primary cormorant-garamond-700 ">
                  {product.title}
                </h1>

                {fitType && (
                  <div className="mt-3 mb-4">
                    <div
                      className="px-[14px] py-[7px] text-[12px] sm:text-[13px] font-bold uppercase rounded-full cursor-default"
                      style={{
                        color: "#642c44",
                        backgroundColor: "#F6EEF2",
                        border: "1px solid #D8C2CC",
                        width: "fit-content",
                        letterSpacing: "0.08em"
                      }}
                    >
                      {fitType}
                    </div>
                  </div>
                )}
                <p className={`${fitType ? "mt-0" : "mt-1"} text-sm sm:text-base text-muted-foreground montserrat-500 tracking-[0.05em] uppercase`}>
                  Designed for Timeless Elegance
                </p>


 
              </div>

              {/* Price + rating */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 montserrat-500">
                <div className="flex items-center gap-2">
                  <span className="text-2xl sm:text-[28px] lg:text-[30px] font-semibold" style={{ color: BRAND }}>
                    {formatMoney(price)}
                  </span>
                  {compareAt && (
                    <span className="text-sm text-muted-foreground line-through">
                      {formatMoney(compareAt)}
                    </span>
                  )}
                </div>

                <div className="hidden h-5 w-px bg-border sm:block item" />

                <div className="flex items-center gap-1.5 text-sm text-muted-foreground group">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    className={totalReviews > 0 ? "translate-y-[1px]" : "hidden"}
                    fill="#f6c343"
                    aria-hidden
                  >
                    <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>

                  {(() => {
                    const avg = totalReviews > 0
                      ? (approvedReviews.reduce((s, r) => s + Number(r?.rate || 0), 0) / totalReviews).toFixed(1)
                      : null;

                    const scrollToReviews = () => {
                      try {
                        const el = document.getElementById("customer-reviews-section") ||
                          document.getElementById("customer-reviews") ||
                          document.querySelector("[data-review-list]");
                        if (!el) return;
                        el.scrollIntoView({ behavior: "smooth" });
                      } catch (e) {
                        console.warn("scrollToReviews failed:", e);
                      }
                    };

                    if (avg) {
                      return (
                        <button
                          type="button"
                          onClick={scrollToReviews}
                          className="inline-flex items-center gap-2 text-sm text-primary/80 hover:text-primary transition-all duration-200 hover:bg-primary/5 px-2 py-1 rounded-lg -ml-2 group"
                          title={`See ${totalReviews} reviews`}
                        >
                          <span className="font-bold text-[14px] leading-none group-hover:scale-110 transition-transform duration-200">{avg}/5</span>
                          <span className="text-emerald-600 font-semibold text-[13px] leading-none">({totalReviews} {totalReviews === 1 ? "review" : "reviews"})</span>
                        </button>
                      );
                    }
                    return (
                      <button
                        type="button"
                        onClick={scrollToReviews}
                        className="hidden"
                        title="No reviews yet — jump to reviews"
                      >
                        <span className="text-[13px] font-semibold montserrat-600">No reviews yet</span>
                      </button>
                    );
                  })()}

                  {totalReviews > 0 && <div className="hidden h-5 w-px bg-border sm:block item" />}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1.5 text-primary/80 hover:text-primary px-2 -ml-1 h-8 rounded-lg hover:bg-primary/5 transition-all duration-200"
                    onClick={() => setIsSizeChartOpen(true)}
                  >
                    <Ruler size={14} className="text-primary/60" />
                    <span className="text-[13px] font-semibold tracking-[0.1em] montserrat-600 uppercase ">Size Chart</span>
                  </Button>
                </div>
              </div>

              <div className="h-px w-full bg-border" />

              {/* Options selection */}
              <div className="space-y-4 sm:space-y-5">
                {product.options.map((opt) => {
                  const isSizeOption = isSizeOptionName(opt?.name);
                  const showSizeFocus = isSizeOption && sizeNeedsSelection && !selectedOptions[opt.name];
                  const valuesWithSwatch =
                    (opt.optionValues?.map((v) => ({ name: v?.name, swatchColor: v?.swatch?.color || null })) ||
                      (opt.values || []).map((name) => ({ name, swatchColor: null })));
                  return (
                    <div
                      key={opt.id}
                      ref={isSizeOption ? sizeSectionRef : undefined}
                      tabIndex={isSizeOption ? -1 : undefined}
                      className={[
                        "space-y-1.5 transition-all duration-200",
                        showSizeFocus ? "rounded-2xl border-2 border-primary bg-primary/5 p-3 sm:p-4 animate-shake" : "",
                      ].join(" ")}
                    >
                      <div
                        className={[
                          "font-semibold text-muted-foreground flex items-center flex-wrap gap-3",
                          "text-[14px] sm:text-[14px] tracking-[0.1em] ",
                        ].join(" ")}
                      >
                        <span>
                          {opt.name}:{" "}
                          <span className="normal-case text-foreground uppercase">
                            {selectedOptions[opt.name] || (isSizeOption ? "Choose your size" : "")}
                          </span>
                        </span>
                      </div>

                      {isSizeOption && fitGuidance && (
                        <div
                          className="mt-2 mb-4 text-[14px] font-semibold leading-[1.4]"
                          style={{ color: "#642c44" }}
                        >
                          {fitGuidance}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 sm:gap-2.5">
                        {valuesWithSwatch.map(({ name: val, swatchColor }) => {
                          const active = selectedOptions[opt.name] === val;
                          const isColor = isColorOption(opt.name);
                          const cssColor = isColor && swatchColor && looksLikeCssColor(swatchColor) ? swatchColor : null;

                          const available = (product?.variants?.edges || []).some(({ node }) => {
                            const opts = Object.fromEntries((node.selectedOptions || []).map((o) => [o.name, o.value]));
                            const proposed = { ...selectedOptions, [opt.name]: val };
                            const matches = Object.entries(proposed).every(([k, v]) => !v || String(opts[k] || "").toLowerCase() === String(v).toLowerCase());
                            return matches && node.availableForSale && (node.quantityAvailable == null || node.quantityAvailable > 0);
                          });

                          if (isColor && cssColor) {
                            return (
                              <button
                                key={val}
                                type="button"
                                disabled={!available}
                                onClick={() => available && setSelectedOptions((prev) => ({ ...prev, [opt.name]: val }))}
                                aria-pressed={active}
                                aria-label={`${opt.name} ${val}`}
                                title={val}
                                className={[
                                  "relative inline-flex items-center justify-center",
                                  "h-9 w-9 sm:h-10 sm:w-10 rounded-full border transition-all",
                                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                                  active ? "border-transparent ring-2 ring-offset-2 scale-110" : "border-border bg-background hover:scale-105",
                                  !available && "opacity-40 cursor-not-allowed",
                                ].join(" ")}
                                style={{ backgroundColor: cssColor }}
                              >
                                <span aria-hidden className="absolute inset-0 rounded-full" style={{ boxShadow: "inset 0 0 0 1px rgba(0,0,0,.08)" }} />
                                <span className="sr-only">{val}</span>
                              </button>
                            );
                          }

                          return (
                            <button
                              key={val}
                              type="button"
                              disabled={!available}
                              onClick={() => {
                                if (!available) return;
                                setSelectedOptions((prev) => ({ ...prev, [opt.name]: val }));
                                if (isSizeOption) setSizeNeedsSelection(false);
                              }}
                              aria-pressed={active}
                              aria-label={`${opt.name} ${val}${!available ? " (out of stock)" : ""}`}
                              className={[
                                "relative inline-flex h-9 sm:h-10 min-w-9 sm:min-w-10 items-center justify-center rounded-full px-3 sm:px-4 text-sm transition-all overflow-hidden",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                                active
                                  ? "border border-transparent text-white scale-105"
                                  : available
                                    ? "border border-border bg-background text-foreground hover:bg-muted hover:scale-105"
                                    : "border border-dashed border-border/70 bg-background text-muted-foreground cursor-not-allowed opacity-60",
                              ].join(" ")}
                              style={{ backgroundColor: active ? BRAND : undefined }}
                            >
                              {val}
                              {/* diagonal strikethrough for out-of-stock */}
                              {!available && (
                                <svg
                                  aria-hidden
                                  className="pointer-events-none absolute inset-0 w-full h-full"
                                  xmlns="http://www.w3.org/2000/svg"
                                  preserveAspectRatio="none"
                                >
                                  <line
                                    x1="15%"
                                    y1="85%"
                                    x2="85%"
                                    y2="15%"
                                    stroke="currentColor"
                                    strokeWidth="1"
                                    strokeOpacity="0.35"
                                  />
                                </svg>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Qty + Add to Cart + Wishlist */}
              <div className="flex flex-col gap-4">
                <div className="flex w-full items-stretch gap-3">
                  {/* Actions: Wishlist + Add to Bag (Secondary) */}
                  <button
                    type="button"
                    onClick={toggleWishlist}
                    aria-pressed={wishlisted}
                    aria-label={wishlisted ? "Remove from favorites" : "Add to favorites"}
                    title={wishlisted ? "Remove from favorites" : "Add to favorites"}
                    className={[
                      "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] border border-black/10 bg-white transition-all hover:bg-gray-50 active:scale-[0.96]",
                      wishlisted ? "text-primary border-primary/30 bg-primary/5" : "text-primary",
                    ].join(" ")}
                  >
                    <Heart
                      className={["h-5 w-5 transition-all duration-300", wishlisted ? "scale-110" : ""].join(" ")}
                      style={wishlisted ? { color: BRAND, fill: BRAND } : { color: "currentColor", fill: "none" }}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={isAddToBagDisabled}
                    className={[
                      "inline-flex flex-1 items-center justify-center rounded-[12px] border",
                      "h-12 text-[14px] font-semibold uppercase tracking-[0.15em]",
                      "px-6 transition-all hover:bg-gray-50 active:scale-[0.99]",
                      isAddToBagDisabled ? "opacity-50 cursor-not-allowed" : "hover:opacity-90",
                    ].join(" ")}
                    style={{
                      borderColor: BRAND,
                      color: BRAND,
                      backgroundColor: "transparent"
                    }}
                  >
                    {adding ? "ADDING..." : "ADD TO CART"}
                  </button>
                </div>

                {/* Primary Action: Buy Now */}
                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={!canAttemptAdd || buying}
                  className={[
                    "relative overflow-hidden inline-flex w-full items-center justify-center rounded-[12px]",
                    "h-14 text-[15px] font-bold text-white uppercase tracking-[0.15em]",
                    "transition-all duration-300 active:scale-[0.98] shadow-sm hover:shadow-md mt-4 lg:mt-0",
                    (!canAttemptAdd || buying) ? "opacity-60 cursor-not-allowed" : "hover:brightness-110",
                  ].join(" ")}
                  style={{ backgroundColor: BRAND }}
                >
                  {buying ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      PROCEEDING...
                    </span>
                  ) : canAttemptAdd ? (
                    "Buy Now"
                  ) : (
                    "SOLD OUT"
                  )}
                </button>
              </div>

              {isExpressShipping && (
                <p className="mt-1 text-center text-[13px] font-bold uppercase tracking-[0.12em] montserrat-600 text-black">
                  Ready to Ship
                </p>
              )}

              {!isExpressShipping && shippingMessage && (
                <p className="mt-1 text-center text-[13px] font-semibold uppercase tracking-[0.12em] montserrat-600" style={{ color: BRAND }}>
                  {shippingMessage}
                </p>
              )}

              <ul
                aria-label="Shopping trust badges"
                className="grid w-full grid-cols-4 items-start gap-1 pt-2 sm:mx-auto sm:max-w-[520px] sm:gap-3"
              >
                {ADD_TO_BAG_TRUST_BADGES.map((badge) => (
                  <li
                    key={badge.label}
                    className="flex min-w-0 flex-col items-center justify-start text-center"
                  >
                    <Image
                      src={badge.icon}
                      alt=""
                      aria-hidden="true"
                      width={40}
                      height={40}
                      className="mb-2 h-10 w-10 object-contain brightness-0 sm:h-11 sm:w-11"
                      draggable="false"
                    />
                    <span className="max-w-none whitespace-nowrap text-[8px] font-medium leading-tight text-black sm:text-[10px]">
                      {badge.label}
                    </span>
                  </li>
                ))}
              </ul>

              <RelatedStyles products={relatedProducts} />

              <CouponCarousel coupons={DEFAULT_COUPONS} />

              <WhyLoveDescriptionCard
                html={product?.descriptionHtml}
                text={product?.description}
                alwaysExpanded
                cardClassName="border-0 shadow-none"
                titleClassName="text-left"
              />

              <WhyLoveAndDetails
                embedded
                showDescription={false}
                handle={handle}
                productId={product?.id}
                productTitle={product?.title}
                productImage={popupThumb}
                productSku={selectedVariant?.sku || ""}
              />

              {/* <div className="mt-3 flex items-center gap-5 p-5 border border-black/5 rounded-xl bg-[#fafafa] shadow-sm">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full text-white shrink-0 shadow-lg"
                    style={{ backgroundColor: BRAND }}
                  >
                    <Truck size={24} strokeWidth={1.5} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex">
                      <span
                        className="px-2.5 py-1 text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-sm montserrat-700"
                        style={{ backgroundColor: BRAND }}
                      >
                        Estimated Delivery
                      </span>
                    </div>
                    <span className="text-[16px] font-semibold montserrat-600" style={{ color: BRAND }}>
                    Arrives in 7–10 Business Days
                    </span>
                  </div>
                </div> */}


            </section>
          </div>
        </div>
      </section>

      <SizeChartSlider isOpen={isSizeChartOpen} onClose={() => setIsSizeChartOpen(false)} />

      <ProductImageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        images={galleryImages}
        initialIndex={activeImg}
      />

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .mask-fade-bottom { -webkit-mask-image: linear-gradient(to bottom, black 80%, transparent 100%); mask-image: linear-gradient(to bottom, black 80%, transparent 100%); }
        .mask-fade-top { -webkit-mask-image: linear-gradient(to top, black 80%, transparent 100%); mask-image: linear-gradient(to top, black 80%, transparent 100%); }
        .mask-fade-both { -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%); mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%); }
        [data-dot-track]::-webkit-scrollbar { display: none; height: 0; }
        .no-drag-img { -webkit-user-drag: none; user-drag: none; -webkit-touch-callout: none; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
        #product-header p.montserrat-500 + span.text-muted-foreground { display: none; }
      `}</style>
    </>
  );
}

