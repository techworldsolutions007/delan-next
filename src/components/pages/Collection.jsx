'use client';
import Link from 'next/link';
import { useRouter, usePathname, useParams, useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Check, X, SlidersHorizontal, Rows2, Columns2, ChevronDown } from "lucide-react";
import LazySection from "@/components/LazySection";
import ProductCard from "@/components/Product/ProductCard";
import { useQuickBuy } from "@/context/QuickBuyContext";
import { releaseFocusForCheckout } from "@/lib/checkout-helpers";
import { normalizeLooks } from "@/lib/looks";

import { CART_CREATE, CART_LINES_ADD, GET_COLLECTION_BY_HANDLE, GET_SALE_AUGMENT } from "@/lib/queries";
import { shopify } from "@/lib/shopify";
import { trackAddToCart } from "@/lib/analytics";

const READY_TO_SHIP_TAGS = new Set([
  "ready-to-ship", "express", "express-collection",
  "ships-in-one-day", "1-day-delivery"
]);

const EXPRESS_COLLECTION_HANDLES = new Set([
  "express-collection", "express", "ready-to-ship",
  "ships-in-one-day", "1-day-delivery"
]);

const OFFER_COLLECTION_HANDLES = new Set([
  "offer", "offers", "sale", "deals", "on-sale", "sale-products"
]);

const CART_QUERY = /* GraphQL */ `
  query CartQuery($cartId: ID!) {
    cart(id: $cartId) {
      id
      checkoutUrl
    }
  }
`;

const SEARCH_PRODUCTS = `
  query SearchProducts($query: String!, $first: Int!, $after: String, $sortKey: ProductSortKeys, $reverse: Boolean) {
    products(first: $first, query: $query, after: $after, sortKey: $sortKey, reverse: $reverse) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id title handle
          createdAt
          publishedAt
          tags
          collections(first: 10) { edges { node { handle } } }
          images(first: 2) { edges { node { url altText } } }
          priceRange { minVariantPrice { amount currencyCode } }
          variants(first: 20) {
            edges {
              node {
                id
                availableForSale
                quantityAvailable
                selectedOptions { name value }
                price { amount currencyCode }
                compareAtPrice { amount currencyCode }
              }
            }
          }
          metafield(namespace: "reviews", key: "rating") { value }
        }
      }
    }
  }
`;

const BRAND = "#642c44";
const CART_ID_KEY = "shopifyCartId";
const MOBILE_COLS_KEY = "collection_mobile_cols";
const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];

const getCollectionSortArgs = (sort) => {
  switch (sort) {
    case "date-desc": return { sortKey: "CREATED", reverse: true };
    case "price-asc": return { sortKey: "PRICE", reverse: false };
    case "price-desc": return { sortKey: "PRICE", reverse: true };
    case "title-asc": return { sortKey: "TITLE", reverse: false };
    case "title-desc": return { sortKey: "TITLE", reverse: true };
    case "featured":
    default: return { sortKey: "COLLECTION_DEFAULT", reverse: false };
  }
};

const getSearchSortArgs = (sort) => {
  switch (sort) {
    case "date-desc": return { sortKey: "CREATED_AT", reverse: true };
    case "price-asc": return { sortKey: "PRICE", reverse: false };
    case "price-desc": return { sortKey: "PRICE", reverse: true };
    case "title-asc": return { sortKey: "TITLE", reverse: false };
    case "title-desc": return { sortKey: "TITLE", reverse: true };
    case "featured":
    default: return { sortKey: "RELEVANCE", reverse: false };
  }
};

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'date-desc', label: 'Newest First' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'title-asc', label: 'Title: A–Z' },
  { value: 'title-desc', label: 'Title: Z–A' },
];

const LookCollection = React.lazy(() => import("../Product/LookCollection"));
const SuggestionSection = React.lazy(() => import("../Product/SuggestionSection"));
const RecentlyViewed = React.lazy(() => import("../Product/RecentlyViewed"));
const COLLECTION_TAIL_SECTIONS = [
  {
    key: "suggestions",
    minHeight: "60vh",
    rootMargin: "350px 0px",
    render: () => <SuggestionSection />,
  },
  {
    key: "recently-viewed",
    minHeight: "55vh",
    rootMargin: "350px 0px",
    render: () => <RecentlyViewed />,
  },
];

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

const NORMALIZE_SLUG = (slug) =>
  (slug || "").toString().trim().toLowerCase();

const slugToLabel = (slug) => {
  const cleaned = (slug || "")
    .toString().trim().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
  if (!cleaned) return "";
  return cleaned.split(" ").map((w) => (w ? w[0].toUpperCase() + w.slice(1) : "")).join(" ");
};

const parseDisplayOrder = (raw) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((v) => NORMALIZE_SLUG(v)).filter(Boolean);
  } catch { }
  return raw.toString().split(/[\n,•;|]+/g).map((v) => NORMALIZE_SLUG(v)).filter(Boolean);
};

const parseListMetafield = (raw) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((v) => NORMALIZE_SLUG(v)).filter(Boolean);
  } catch { }
  return raw.toString().split(/[\n,•;|]+/g).map((v) => NORMALIZE_SLUG(v)).filter(Boolean);
};

function parseNavConfig(col) {
  const ncRef = col?.navConfig?.reference;
  if (!ncRef) return null;
  try {
    const modeRaw = ncRef?.mode?.value || "";
    const mode = modeRaw.toString().trim().toLowerCase();
    if (mode !== "filter_subcategory" && mode !== "child_collections") return null;
    const navTitle = ncRef?.navTitle?.value || "";
    const showAllRaw = ncRef?.showAllTab?.value;
    const showAllTab =
      typeof showAllRaw === "string" ? showAllRaw.toLowerCase() === "true" : Boolean(showAllRaw);
    const filterNamespace = (ncRef?.filterNamespace?.value || "").toString().trim();
    const filterKey = (ncRef?.filterKey?.value || "").toString().trim();
    const displayOrderSlugs = parseDisplayOrder(ncRef?.displayOrder?.value || "");
    const childEdges = ncRef?.childCollectionsField?.references?.edges || [];
    const childCollections = childEdges
      .map((e) => e?.node).filter(Boolean)
      .map((n) => ({ id: n.id, handle: n.handle, title: n.title }));
    return { mode, navTitle, showAllTab, filterNamespace, filterKey, displayOrderSlugs, childCollections };
  } catch {
    return null;
  }
}

const deriveSubcategorySlugs = (rawProducts, navConfig) => {
  const explicit = Array.isArray(navConfig?.displayOrderSlugs) ? navConfig.displayOrderSlugs : [];
  if (explicit.length) return explicit;
  const set = new Set();
  for (const p of rawProducts || []) {
    if (Array.isArray(p?.subcategorySlugs)) for (const s of p.subcategorySlugs) set.add(s);
  }
  return Array.from(set);
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function toProductShape(node, currentCollectionHandle = "") {
  let ratingValue = 0;
  const ratingField = node?.metafield?.value;
  if (ratingField) {
    try {
      const parsed = JSON.parse(ratingField);
      ratingValue = Number.parseFloat(parsed?.value ?? 0) || 0;
    } catch {
      const n = Number(ratingField);
      if (Number.isFinite(n)) ratingValue = n;
    }
  }
  const imgs = node?.images?.edges ?? [];
  const img1 = imgs[0]?.node;
  const img2 = imgs[1]?.node;
  const vars = node?.variants?.edges ?? [];
  const isAvailable = (vNode) => vNode && vNode.availableForSale && (vNode.quantityAvailable == null || vNode.quantityAvailable > 0);
  const firstAvailable = vars.find(v => isAvailable(v.node))?.node || vars[0]?.node;
  const compareAtPrice = vars[0]?.node?.compareAtPrice?.amount || null;
  const img1Url = img1?.url || "https://via.placeholder.com/600x800";
  const img2Url = img2?.url && img2?.url !== img1?.url ? img2.url : null;

  const listSubs = parseListMetafield(node?.subcategories?.value);
  const singleSub = NORMALIZE_SLUG(node?.subcategory?.value);
  const subcategorySlugs = listSubs.length ? listSubs : singleSub ? [singleSub] : [];

  const productTags = Array.isArray(node.tags)
    ? node.tags.map(t => (t || "").toLowerCase().trim().replace(/[\s_]+/g, "-"))
    : [];
  const collectionHandles = (node.collections?.edges ?? []).map(
    ({ node: c }) => (c?.handle || "").toLowerCase().trim()
  );
  const isReadyToShip =
    EXPRESS_COLLECTION_HANDLES.has((currentCollectionHandle || "").toLowerCase()) ||
    collectionHandles.some(h => EXPRESS_COLLECTION_HANDLES.has(h)) ||
    productTags.some(t => READY_TO_SHIP_TAGS.has(t));

  // Extract sizes from variant selectedOptions
  const sizeSet = new Set();
  for (const edge of vars) {
    for (const opt of (edge?.node?.selectedOptions ?? [])) {
      const optName = (opt.name || "").toLowerCase().replace(/[\s()]/g, "");
      if (optName.startsWith("size")) {
        sizeSet.add(opt.value.trim());
      }
    }
  }
  const sizes = [...sizeSet];

  return {
    id: node.id,
    title: node.title,
    handle: node.handle,
    createdAt: node.createdAt || node.publishedAt || null,
    price: node.priceRange?.minVariantPrice?.amount,
    currency: node.priceRange?.minVariantPrice?.currencyCode,
    compareAtPrice,
    imageUrl: img1Url,
    altText: img1?.altText || node.title,
    secondImageUrl: img2Url,
    secondAltText: img2?.altText || img1?.altText || node.title,
    ratingValue: Math.max(0, Math.min(5, Math.round(ratingValue))),
    variantId: firstAvailable?.id || null,
    available: vars.some(v => isAvailable(v.node)),
    subcategorySlug: subcategorySlugs[0] || "",
    subcategorySlugs,
    isReadyToShip,
    tags: productTags,
    sizes,
  };
}

function parseProductsFromCollection(collectionData, currentCollectionHandle = "") {
  const edges = collectionData?.products?.edges ?? [];
  return edges.map(({ node }) => toProductShape(node, currentCollectionHandle));
}

const getStoredCartId = () => { try { return localStorage.getItem(CART_ID_KEY) || null; } catch { return null; } };
const setStoredCartId = (id) => { try { localStorage.setItem(CART_ID_KEY, id); } catch { } };
const clearStoredCartId = () => { try { localStorage.removeItem(CART_ID_KEY); } catch { } };

/* ─── DualRangeSlider ────────────────────────────────────────────────────── */
function DualRangeSlider({ min, max, minValue, maxValue, onChange }) {
  const safeMin = Math.max(min, Math.min(minValue, maxValue));
  const safeMax = Math.min(max, Math.max(minValue, maxValue));
  const range = max - min || 1;
  const step = range > 20000 ? 1000 : range > 5000 ? 500 : range > 2000 ? 200 : 100;
  const minPct = ((safeMin - min) / range) * 100;
  const maxPct = ((safeMax - min) / range) * 100;

  return (
    <div className="relative h-6 flex items-center mt-2">
      <div className="absolute left-0 right-0 h-[2px] bg-neutral-200 rounded" />
      <div
        className="absolute h-[2px] rounded"
        style={{ backgroundColor: BRAND, left: `${minPct}%`, right: `${100 - maxPct}%` }}
      />
      <input
        type="range" min={min} max={max} step={step} value={safeMin}
        onChange={e => onChange([Math.min(Number(e.target.value), safeMax - step), safeMax])}
        className="absolute w-full h-full opacity-0 cursor-pointer"
        style={{ zIndex: safeMin > max - range / 4 ? 5 : 3 }}
      />
      <input
        type="range" min={min} max={max} step={step} value={safeMax}
        onChange={e => onChange([safeMin, Math.max(Number(e.target.value), safeMin + step)])}
        className="absolute w-full h-full opacity-0 cursor-pointer"
        style={{ zIndex: safeMin > max - range / 4 ? 3 : 5 }}
      />
      <div
        className="absolute h-4 w-4 rounded-full border-2 border-white shadow pointer-events-none"
        style={{ backgroundColor: BRAND, left: `${minPct}%`, transform: "translateX(-50%)" }}
      />
      <div
        className="absolute h-4 w-4 rounded-full border-2 border-white shadow pointer-events-none"
        style={{ backgroundColor: BRAND, left: `${maxPct}%`, transform: "translateX(-50%)" }}
      />
    </div>
  );
}

/* ─── FilterDrawer ───────────────────────────────────────────────────────── */
function FilterDrawer({ open, onClose, products, priceRange, availableSizes, initialFilters, onApply }) {
  const [local, setLocal] = useState(initialFilters);

  useEffect(() => {
    if (open) setLocal(initialFilters);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const lMin = local.priceMin ?? priceRange.min;
  const lMax = local.priceMax ?? priceRange.max;

  const clearLocal = () => setLocal({ priceMin: null, priceMax: null, sizes: [], dispatch: [] });

  // Live count for the CTA button
  const previewCount = useMemo(() => {
    let arr = products;
    if (local.priceMin !== null) arr = arr.filter(p => Number(p.price) >= local.priceMin);
    if (local.priceMax !== null) arr = arr.filter(p => Number(p.price) <= local.priceMax);
    if (local.sizes.length) arr = arr.filter(p => p.sizes?.some(s => local.sizes.includes(s)));
    if (local.dispatch.length) {
      arr = arr.filter(p => {
        if (local.dispatch.includes("ready") && p.isReadyToShip) return true;
        if (local.dispatch.includes("made") && !p.isReadyToShip) return true;
        return false;
      });
    }
    return arr.length;
  }, [products, local]);

  const hasLocalFilters =
    local.priceMin !== null ||
    local.priceMax !== null ||
    local.sizes.length > 0 ||
    local.dispatch.length > 0;

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent
        side="left"
        className="w-[300px] sm:w-[360px] p-0 flex flex-col bg-white border-r border-neutral-100 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
          <span className="text-[11px] uppercase tracking-[0.2em] montserrat-600 text-primary">
            Filter
          </span>
          {hasLocalFilters && (
            <button
              onClick={clearLocal}
              className="text-[10px] uppercase tracking-[0.12em] montserrat-500 text-neutral-400 hover:text-primary transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Scrollable sections */}
        <div className="flex-1 overflow-y-auto">
          <Accordion type="multiple" defaultValue={["price", "size", "dispatch"]} className="divide-y divide-neutral-100">

            {/* Price */}
            <AccordionItem value="price" className="border-0">
              <AccordionTrigger className="px-6 py-4 text-[11px] uppercase tracking-[0.18em] montserrat-600 text-primary hover:no-underline hover:bg-neutral-50/50">
                Price
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-5">
                <DualRangeSlider
                  min={priceRange.min}
                  max={priceRange.max}
                  minValue={lMin}
                  maxValue={lMax}
                  onChange={([mn, mx]) => setLocal(f => ({ ...f, priceMin: mn, priceMax: mx }))}
                />
                <div className="flex justify-between mt-4 text-[12px] montserrat-600 text-primary">
                  <span>₹{lMin.toLocaleString("en-IN")}</span>
                  <span>₹{lMax.toLocaleString("en-IN")}</span>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Size */}
            {availableSizes.length > 0 && (
              <AccordionItem value="size" className="border-0">
                <AccordionTrigger className="px-6 py-4 text-[11px] uppercase tracking-[0.18em] montserrat-600 text-primary hover:no-underline hover:bg-neutral-50/50">
                  Size
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-5">
                  <div className="flex flex-wrap gap-2">
                    {availableSizes.map(size => {
                      const active = local.sizes.includes(size);
                      return (
                        <button
                          key={size}
                          onClick={() => setLocal(f => ({
                            ...f,
                            sizes: active ? f.sizes.filter(s => s !== size) : [...f.sizes, size],
                          }))}
                          className={`px-3.5 py-2 text-[11px] uppercase tracking-[0.08em] montserrat-500 border transition-all ${
                            active
                              ? "border-[#642c44] bg-[#642c44] text-white"
                              : "border-neutral-200 text-neutral-600 hover:border-[#642c44] hover:text-[#642c44]"
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Dispatch */}
            <AccordionItem value="dispatch" className="border-0">
              <AccordionTrigger className="px-6 py-4 text-[11px] uppercase tracking-[0.18em] montserrat-600 text-primary hover:no-underline hover:bg-neutral-50/50">
                Dispatch
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-5">
                <div className="flex flex-col gap-2.5">
                  {[
                    { value: "ready", label: "Ready to Ship", desc: "Available for quicker dispatch" },
                    { value: "made", label: "Made for You", desc: "Crafted after you order" },
                  ].map(opt => {
                    const active = local.dispatch.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setLocal(f => ({
                          ...f,
                          dispatch: active
                            ? f.dispatch.filter(d => d !== opt.value)
                            : [...f.dispatch, opt.value],
                        }))}
                        className={`flex items-start gap-3 p-3.5 border text-left transition-all ${
                          active
                            ? "border-[#642c44] bg-[#642c44]/[0.04]"
                            : "border-neutral-200 hover:border-neutral-400"
                        }`}
                      >
                        <div
                          className={`mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-[1.5px] flex items-center justify-center transition-colors ${
                            active ? "border-[#642c44] bg-[#642c44]" : "border-neutral-300"
                          }`}
                        >
                          {active && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                        <div>
                          <p className={`text-[11px] uppercase tracking-[0.1em] montserrat-600 ${active ? "text-[#642c44]" : "text-neutral-700"}`}>
                            {opt.label}
                          </p>
                          <p className="text-[10px] text-neutral-400 montserrat-500 mt-0.5 normal-case tracking-normal leading-snug">
                            {opt.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        </div>

        {/* Sticky CTA */}
        <div className="shrink-0 px-6 py-5 border-t border-neutral-100">
          <button
            onClick={() => onApply(local)}
            className="w-full py-4 text-white text-[11px] uppercase tracking-[0.2em] montserrat-600 transition-colors"
            style={{ backgroundColor: BRAND }}
          >
            Show {previewCount} {previewCount === 1 ? "Style" : "Styles"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ─── Sort option rows (shared) ─────────────────────────────────────────── */
function SortOptionList({ sort, onSortChange, onClose }) {
  return SORT_OPTIONS.map(opt => (
    <button
      key={opt.value}
      onClick={() => { onSortChange(opt.value); onClose?.(); }}
      className={`w-full flex items-center justify-between py-3 text-[11px] border-b border-neutral-50 last:border-0 montserrat-500 uppercase tracking-[0.1em] transition-colors text-left ${
        sort === opt.value ? "text-primary" : "text-neutral-400 hover:text-neutral-700"
      }`}
    >
      {opt.label}
      {sort === opt.value && <Check className="h-3 w-3 text-primary shrink-0" />}
    </button>
  ));
}

/* ─── Desktop sort popover ───────────────────────────────────────────────── */
function DesktopSortPopover({ sort, onSortChange }) {
  const activeSortLabel = SORT_OPTIONS.find(o => o.value === sort)?.label || "Featured";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] montserrat-600 text-primary hover:opacity-70 transition-opacity">
          {activeSortLabel}
          <ChevronDown className="h-3 w-3 shrink-0" strokeWidth={1.5} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-52 p-0 bg-white border border-neutral-100 shadow-sm rounded-none"
      >
        <div className="px-4 py-1">
          <SortOptionList sort={sort} onSortChange={onSortChange} />
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ─── Mobile sort sheet ──────────────────────────────────────────────────── */
function MobileSortSheet({ open, onClose, sort, onSortChange }) {
  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-xl p-0 overflow-hidden bg-white">
        <div className="px-5 pt-5 pb-1">
          <p className="text-[10px] uppercase tracking-[0.2em] montserrat-600 text-neutral-400">Sort By</p>
        </div>
        <div className="px-5 pb-8">
          <SortOptionList sort={sort} onSortChange={onSortChange} onClose={onClose} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ─── CategoryTabs ───────────────────────────────────────────────────────── */
function CategoryTabs({ items }) {
  const scrollRef = useRef(null);
  const buttonRefs = useRef({});
  const [showRight, setShowRight] = useState(false);

  const updateFade = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateFade();
    el.addEventListener("scroll", updateFade, { passive: true });
    const ro = new ResizeObserver(updateFade);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", updateFade); ro.disconnect(); };
  }, [updateFade]);

  useEffect(() => {
    const activeItem = items.find(i => i.isActive);
    if (activeItem) {
      buttonRefs.current[activeItem.key]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [items]);

  if (!items || items.length === 0) return null;

  return (
    <div className="relative border-b border-neutral-200">
      {showRight && (
        <div className="absolute right-0 top-0 bottom-0 w-10 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to left, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)" }}
        />
      )}
      <div
        ref={scrollRef}
        className="flex items-end overflow-x-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {items.map(({ key, label, isActive, onClick }) => (
          <button
            key={key}
            ref={el => { buttonRefs.current[key] = el; }}
            type="button"
            onClick={onClick}
            className="relative shrink-0 px-4 py-3 text-[10px] sm:text-[11px] uppercase tracking-[0.15em] montserrat-500 transition-colors whitespace-nowrap"
            style={{ color: isActive ? BRAND : "#9ca3af" }}
          >
            {label}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ backgroundColor: BRAND }} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── FilterChips ────────────────────────────────────────────────────────── */
function FilterChips({ filters, priceRange, onRemovePrice, onRemoveSize, onRemoveDispatch, onClear }) {
  const chips = [];
  if (filters.priceMin !== null || filters.priceMax !== null) {
    const mn = filters.priceMin ?? priceRange.min;
    const mx = filters.priceMax ?? priceRange.max;
    chips.push({ id: "price", label: `₹${mn.toLocaleString("en-IN")} – ₹${mx.toLocaleString("en-IN")}`, onRemove: onRemovePrice });
  }
  filters.sizes.forEach(s => chips.push({ id: `size-${s}`, label: s, onRemove: () => onRemoveSize(s) }));
  filters.dispatch.forEach(d => chips.push({
    id: `dispatch-${d}`,
    label: d === "ready" ? "Ready to Ship" : "Made for You",
    onRemove: () => onRemoveDispatch(d),
  }));

  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 py-3">
      {chips.map(chip => (
        <button
          key={chip.id}
          onClick={chip.onRemove}
          className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 border border-neutral-200 text-[10px] uppercase tracking-[0.1em] montserrat-500 text-neutral-600 hover:border-[#642c44] hover:text-[#642c44] transition-colors"
        >
          {chip.label}
          <X className="h-2.5 w-2.5" />
        </button>
      ))}
      {chips.length > 1 && (
        <button
          onClick={onClear}
          className="text-[10px] uppercase tracking-[0.1em] montserrat-500 text-neutral-400 hover:text-[#642c44] transition-colors underline underline-offset-2"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function CollectionPage({ handle: handleProp, params, initialData } = {}) {
  const routerParams = useParams();
  const { handle: paramsHandle } = params || {};
  const handle = handleProp || paramsHandle || routerParams?.handle;
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openQuickBuy } = useQuickBuy();
  const qParam = searchParams.get("q");
  const isSearchMode = !!qParam && !handle;

  const hasServerData = !!initialData?.collection;
  const serverDataUsedRef = useRef(false);

  const [loading, setLoading] = useState(!hasServerData);
  const [title, setTitle] = useState(() => initialData?.collection?.title || "");
  const [description, setDescription] = useState(() => initialData?.collection?.description || "");
  const [bannerDesktop, setBannerDesktop] = useState(() => initialData?.collection?.desktopBanner?.reference?.image?.url || "");
  const [bannerMobile, setBannerMobile] = useState(() => initialData?.collection?.mobileBanner?.reference?.image?.url || "");
  const [rawProducts, setRawProducts] = useState(() =>
    hasServerData ? parseProductsFromCollection(initialData.collection, handleProp || paramsHandle || "") : []
  );
  const [looks, setLooks] = useState(() =>
    hasServerData ? normalizeLooks(initialData?.collection) : []
  );
  const [error, setError] = useState("");
  const [navConfig, setNavConfig] = useState(() =>
    hasServerData ? parseNavConfig(initialData.collection) : null
  );
  const [hasNextPage, setHasNextPage] = useState(() =>
    initialData?.collection?.products?.pageInfo?.hasNextPage || false
  );
  const [endCursor, setEndCursor] = useState(() =>
    initialData?.collection?.products?.pageInfo?.endCursor || null
  );
  const [fetchingMore, setFetchingMore] = useState(false);
  const [addBusy, setAddBusy] = useState({});
  const [buying, setBuying] = useState({});
  const [columnsMobile, setColumnsMobile] = useState(2);
  const [gokwikReady, setGokwikReady] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  // Sort from URL
  const sortParam = searchParams.get("sort") || "featured";
  const sort = SORT_OPTIONS.some(o => o.value === sortParam) ? sortParam : "featured";

  const setSort = useCallback((val) => {
    const newParams = new URLSearchParams(searchParams.toString());
    if (val === "featured") newParams.delete("sort");
    else newParams.set("sort", val);
    router.push(`${pathname}?${newParams.toString()}`);
  }, [searchParams, pathname, router]);

  // Active filters from URL
  const priceMinParam = searchParams.get("price_min");
  const priceMaxParam = searchParams.get("price_max");
  const sizesParam = searchParams.get("sizes");
  const dispatchParam = searchParams.get("dispatch");

  const activeFilters = useMemo(() => ({
    priceMin: priceMinParam ? Number(priceMinParam) : null,
    priceMax: priceMaxParam ? Number(priceMaxParam) : null,
    sizes: sizesParam ? sizesParam.split(",").filter(Boolean) : [],
    dispatch: dispatchParam ? dispatchParam.split(",").filter(Boolean) : [],
  }), [priceMinParam, priceMaxParam, sizesParam, dispatchParam]);

  const hasActiveFilters = activeFilters.priceMin !== null || activeFilters.priceMax !== null ||
    activeFilters.sizes.length > 0 || activeFilters.dispatch.length > 0;

  /* ── Persist mobile columns ── */
  useEffect(() => {
    try {
      const val = Number(localStorage.getItem(MOBILE_COLS_KEY));
      if (val === 1 || val === 2) setColumnsMobile(val);
    } catch { }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(MOBILE_COLS_KEY, String(columnsMobile)); } catch { }
  }, [columnsMobile]);

  /* ── Data fetch ── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const isOfferHandle = !isSearchMode && OFFER_COLLECTION_HANDLES.has((handle || "").toLowerCase());
      if (!isSearchMode && hasServerData && !serverDataUsedRef.current && !isOfferHandle) {
        serverDataUsedRef.current = true;
        return;
      }
      if (!serverDataUsedRef.current) serverDataUsedRef.current = true;
      setLoading(true);
      setError("");
      setHasNextPage(false);
      setEndCursor(null);
      setLooks([]);
      try {
        if (isSearchMode) {
          const searchArgs = getSearchSortArgs(sort);
          const data = await shopify(SEARCH_PRODUCTS, { query: qParam, first: 20, ...searchArgs });
          if (cancelled) return;
          const prods = (data?.products?.edges ?? []).map(({ node }) => toProductShape(node));
          const pageInfo = data?.products?.pageInfo;
          setTitle(`Search results for "${qParam}"`);
          setDescription("");
          setBannerDesktop("");
          setBannerMobile("");
          setRawProducts(prods);
          setHasNextPage(pageInfo?.hasNextPage || false);
          setEndCursor(pageInfo?.endCursor || null);
        } else {
          const collectionArgs = getCollectionSortArgs(sort);
          const data = await shopify(GET_COLLECTION_BY_HANDLE, { handle, first: 20, after: null, ...collectionArgs });
          if (cancelled) return;
          const col = data?.collection;
          if (!col) { setTitle(""); setRawProducts([]); return; }
          const desktop = col.desktopBanner?.reference?.image?.url || "";
          const mobile = col.mobileBanner?.reference?.image?.url || "";
          setTitle(col.title || "");
          setDescription(col.description || "");
          setBannerDesktop(desktop);
          setBannerMobile(mobile);
          setNavConfig(parseNavConfig(col));
          setLooks(normalizeLooks(col));
          let pageProducts = parseProductsFromCollection(col, handle);
          const pageInfo = col.products?.pageInfo;
          if (OFFER_COLLECTION_HANDLES.has((handle || "").toLowerCase())) {
            try {
              const augData = await shopify(GET_SALE_AUGMENT, { first: 250 });
              if (cancelled) return;
              const existingIds = new Set(pageProducts.map(p => p.id));
              const augProducts = (augData?.products?.edges ?? [])
                .map(({ node }) => node)
                .filter(n => {
                  const vars = n?.variants?.edges ?? [];
                  return vars.some(v => {
                    const cap = Number(v?.node?.compareAtPrice?.amount);
                    const price = Number(v?.node?.price?.amount);
                    return Number.isFinite(cap) && Number.isFinite(price) && cap > price;
                  });
                })
                .map(n => toProductShape(n, handle))
                .filter(p => !existingIds.has(p.id));
              pageProducts = [...pageProducts, ...augProducts];
            } catch { }
          }
          setRawProducts(pageProducts);
          setHasNextPage(pageInfo?.hasNextPage || false);
          setEndCursor(pageInfo?.endCursor || null);
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [handle, isSearchMode, qParam, sort]);

  /* ── Subcategory state ── */
  const subParamRaw = !isSearchMode ? searchParams.get("sub") : null;
  const activeSubSlug = !isSearchMode ? NORMALIZE_SLUG(subParamRaw) : null;
  const isFilterSubcategoryMode = !isSearchMode && navConfig?.mode === "filter_subcategory";
  const subcategorySlugs = useMemo(() => deriveSubcategorySlugs(rawProducts, navConfig), [rawProducts, navConfig]);

  /* ── Price range from all loaded products ── */
  const priceRange = useMemo(() => {
    const prices = rawProducts.map(p => Number(p.price)).filter(n => Number.isFinite(n) && n > 0);
    if (!prices.length) return { min: 0, max: 10000 };
    return { min: Math.floor(Math.min(...prices) / 100) * 100, max: Math.ceil(Math.max(...prices) / 100) * 100 };
  }, [rawProducts]);

  /* ── Available sizes from all loaded products ── */
  const availableSizes = useMemo(() => {
    const set = new Set();
    rawProducts.forEach(p => p.sizes?.forEach(s => set.add(s)));
    return SIZE_ORDER.filter(s => set.has(s));
  }, [rawProducts]);

  /* ── Subcategory pre-filtered (base for drawer preview) ── */
  const subcategoryProducts = useMemo(() => {
    if (!isFilterSubcategoryMode || !activeSubSlug) return rawProducts;
    if (!subcategorySlugs.includes(activeSubSlug)) return [];
    return rawProducts.filter(p => Array.isArray(p?.subcategorySlugs) && p.subcategorySlugs.includes(activeSubSlug));
  }, [rawProducts, isFilterSubcategoryMode, activeSubSlug, subcategorySlugs]);

  /* ── Fully filtered products (shown in grid) ── */
  const products = useMemo(() => {
    let arr = subcategoryProducts;
    if (activeFilters.priceMin !== null) arr = arr.filter(p => Number(p.price) >= activeFilters.priceMin);
    if (activeFilters.priceMax !== null) arr = arr.filter(p => Number(p.price) <= activeFilters.priceMax);
    if (activeFilters.sizes.length) arr = arr.filter(p => p.sizes?.some(s => activeFilters.sizes.includes(s)));
    if (activeFilters.dispatch.length) {
      arr = arr.filter(p => {
        if (activeFilters.dispatch.includes("ready") && p.isReadyToShip) return true;
        if (activeFilters.dispatch.includes("made") && !p.isReadyToShip) return true;
        return false;
      });
    }
    return arr;
  }, [subcategoryProducts, activeFilters]);

  /* ── Nav items ── */
  const navItems = useMemo(() => {
    if (isSearchMode || !navConfig) return [];
    const items = [];
    if (navConfig.mode === "filter_subcategory" && subcategorySlugs.length > 0) {
      if (navConfig.showAllTab) {
        items.push({ key: "__all__", label: "All", isActive: !activeSubSlug, onClick: () => handleSubcategoryClick(null) });
      }
      subcategorySlugs.forEach(slug => {
        items.push({ key: slug, label: slugToLabel(slug), isActive: activeSubSlug === slug, onClick: () => handleSubcategoryClick(slug) });
      });
    } else if (navConfig.mode === "child_collections" && Array.isArray(navConfig.childCollections) && navConfig.childCollections.length > 0) {
      if (navConfig.showAllTab) {
        items.push({
          key: "__all__", label: "All", isActive: false,
          onClick: () => { router.push(`/collections/${handle}`); window.scrollTo({ top: 0, behavior: "smooth" }); },
        });
      }
      navConfig.childCollections.forEach(col => {
        items.push({ key: col.id, label: col.title, isActive: false, onClick: () => handleChildCollectionClick(col.handle) });
      });
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearchMode, navConfig, subcategorySlugs, activeSubSlug]);

  /* ── Load more ── */
  const handleLoadMore = useCallback(async () => {
    if (!hasNextPage || !endCursor || fetchingMore) return;
    setFetchingMore(true);
    try {
      if (isSearchMode) {
        const searchArgs = getSearchSortArgs(sort);
        const data = await shopify(SEARCH_PRODUCTS, { query: qParam, first: 20, after: endCursor, ...searchArgs });
        const prods = (data?.products?.edges ?? []).map(({ node }) => toProductShape(node));
        const pageInfo = data?.products?.pageInfo;
        setRawProducts(prev => [...prev, ...prods]);
        setHasNextPage(pageInfo?.hasNextPage || false);
        setEndCursor(pageInfo?.endCursor || null);
      } else {
        const collectionArgs = getCollectionSortArgs(sort);
        const data = await shopify(GET_COLLECTION_BY_HANDLE, { handle, first: 20, after: endCursor, ...collectionArgs });
        const col = data?.collection;
        if (col) {
          const prods = parseProductsFromCollection(col, handle);
          const pageInfo = col.products?.pageInfo;
          setRawProducts(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            return [...prev, ...prods.filter(p => !existingIds.has(p.id))];
          });
          setHasNextPage(pageInfo?.hasNextPage || false);
          setEndCursor(pageInfo?.endCursor || null);
        }
      }
    } catch (e) {
      console.error("Load More error:", e);
    } finally {
      setFetchingMore(false);
    }
  }, [hasNextPage, endCursor, fetchingMore, isSearchMode, qParam, handle, sort]);

  const observerTarget = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasNextPage && !fetchingMore) handleLoadMore(); },
      { threshold: 1.0, rootMargin: "200px" }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasNextPage, fetchingMore, handleLoadMore]);

  /* ── Subcategory navigation ── */
  const handleSubcategoryClick = useCallback((slug) => {
    if (isSearchMode) return;
    const newParams = new URLSearchParams(searchParams.toString());
    if (!slug) newParams.delete("sub");
    else newParams.set("sub", NORMALIZE_SLUG(slug));
    const search = newParams.toString();
    router.push(`${pathname}${search ? `?${search}` : ""}`);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [isSearchMode, pathname, searchParams, router]);

  const handleChildCollectionClick = useCallback((childHandle) => {
    if (!childHandle) return;
    router.push(`/collections/${childHandle}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [router]);

  /* ── Filter helpers ── */
  const applyFilters = useCallback((filters) => {
    const newParams = new URLSearchParams(searchParams.toString());
    if (filters.priceMin !== null && filters.priceMin !== priceRange.min)
      newParams.set("price_min", String(filters.priceMin));
    else newParams.delete("price_min");
    if (filters.priceMax !== null && filters.priceMax !== priceRange.max)
      newParams.set("price_max", String(filters.priceMax));
    else newParams.delete("price_max");
    if (filters.sizes.length) newParams.set("sizes", filters.sizes.join(","));
    else newParams.delete("sizes");
    if (filters.dispatch.length) newParams.set("dispatch", filters.dispatch.join(","));
    else newParams.delete("dispatch");
    router.push(`${pathname}?${newParams.toString()}`);
    setFilterOpen(false);
  }, [searchParams, pathname, router, priceRange]);

  const clearAllFilters = useCallback(() => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.delete("price_min");
    newParams.delete("price_max");
    newParams.delete("sizes");
    newParams.delete("dispatch");
    router.push(`${pathname}?${newParams.toString()}`);
  }, [searchParams, pathname, router]);

  const removeFilter = useCallback((type, value) => {
    const newParams = new URLSearchParams(searchParams.toString());
    if (type === "price") { newParams.delete("price_min"); newParams.delete("price_max"); }
    else if (type === "size") {
      const cur = newParams.get("sizes")?.split(",").filter(s => s !== value) ?? [];
      if (cur.length) newParams.set("sizes", cur.join(","));
      else newParams.delete("sizes");
    } else if (type === "dispatch") {
      const cur = newParams.get("dispatch")?.split(",").filter(d => d !== value) ?? [];
      if (cur.length) newParams.set("dispatch", cur.join(","));
      else newParams.delete("dispatch");
    }
    router.push(`${pathname}?${newParams.toString()}`);
  }, [searchParams, pathname, router]);

  /* ── Cart helpers ── */
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

  const handleLookQuickAdd = useCallback(async (product) => {
    const isSingleVariant = product.variants?.length <= 1;
    if (!isSingleVariant) {
      openQuickBuy({ handle: product.handle, title: product.title, price: product.priceRange?.minVariantPrice?.amount, imageUrl: product.imageUrl });
      return;
    }
    const variantId = product.variants[0]?.id;
    if (!variantId) { router.push(`/products/${product.handle}`); return; }
    setAddBusy((s) => ({ ...s, [product.id]: true }));
    try {
      const cartId = await ensureCartId();
      const res = await shopify(CART_LINES_ADD, { cartId, lines: [{ merchandiseId: variantId, quantity: 1 }] });
      const errs = res?.cartLinesAdd?.userErrors;
      if (errs?.length) throw new Error(errs.map((e) => e.message).join('; '));
      const cartData = res?.cartLinesAdd?.cart;
      window.dispatchEvent(new CustomEvent('cart:updated', { detail: { totalQuantity: cartData?.totalQuantity ?? 0 } }));
      window.dispatchEvent(new CustomEvent('cart:item-added'));
      trackAddToCart({ productGid: product.id, variantGid: variantId, productTitle: product.title, price: product.priceRange?.minVariantPrice?.amount ?? '0', cartId: cartData?.id ?? cartId ?? '', quantity: 1 });
      setAddBusy((s) => ({ ...s, [product.id]: 'added' }));
      setTimeout(() => setAddBusy((s) => ({ ...s, [product.id]: false })), 1200);
    } catch (e) {
      alert(e?.message || 'Could not add to cart.');
      setAddBusy((s) => ({ ...s, [product.id]: false }));
    }
  }, [ensureCartId, openQuickBuy, router]);

  /* ── GoKwik init ── */
  useEffect(() => {
    if (!GOKWIK_ENABLED || !GOKWIK_MID) { setGokwikReady(false); return; }
    window.merchantInfo = {
      ...(window.merchantInfo || {}),
      mid: GOKWIK_MID, merchantId: GOKWIK_MID, environment: GOKWIK_ENV, type: "merchantInfo",
      ...(GOKWIK_STORE_ID ? { storeId: GOKWIK_STORE_ID } : {}),
      ...(GOKWIK_FB_PIXEL ? { fbPixel: GOKWIK_FB_PIXEL } : {}),
    };
    if (!document.getElementById("gokwik-sdk")) {
      const s = document.createElement("script");
      s.id = "gokwik-sdk"; s.async = true;
      s.src = "https://pdp.gokwik.co/merchant-integration/build/merchant.integration.js?v4";
      s.onload = () => {
        try { if (window.gokwikSdk?.init) window.gokwikSdk.init(); } catch { }
        setGokwikReady(Boolean(window.triggerGokwikCustomCheckout || window.gokwikSdk));
        window.triggerGokwikCheckout = function triggerGokwikCheckout(cartId) {
          window.merchantInfo = {
            ...(window.merchantInfo || {}),
            mid: GOKWIK_MID, merchantId: GOKWIK_MID, environment: GOKWIK_ENV, type: "merchantInfo",
            ...(GOKWIK_STORE_ID ? { storeId: GOKWIK_STORE_ID } : {}),
            ...(GOKWIK_FB_PIXEL ? { fbPixel: GOKWIK_FB_PIXEL } : {}),
            cart: { id: cartId },
          };
          if (typeof window.triggerGokwikCustomCheckout === "function") window.triggerGokwikCustomCheckout();
        };
      };
      s.onerror = () => setGokwikReady(false);
      document.body.appendChild(s);
    } else {
      setGokwikReady(Boolean(window.triggerGokwikCustomCheckout || window.gokwikSdk));
    }
  }, []);

  const triggerGokwikOrFallback = useCallback(async (cartId, maybeCheckoutUrl) => {
    releaseFocusForCheckout();
    if (GOKWIK_ENABLED && GOKWIK_MID && typeof window.triggerGokwikCheckout === "function") {
      try { window.triggerGokwikCheckout(cartId); return; } catch { }
    }
    if (maybeCheckoutUrl) { window.open(maybeCheckoutUrl, "_blank", "noopener,noreferrer"); return; }
    try {
      const data = await shopify(CART_QUERY, { cartId });
      const url = data?.cart?.checkoutUrl;
      window.open(url || "/cart", "_blank", "noopener,noreferrer");
    } catch { window.open("/cart", "_blank", "noopener,noreferrer"); }
  }, []);

  const handleAddToCart = useCallback(async (product) => {
    if (product.variants?.edges?.length > 1) {
      openQuickBuy({ handle: product.handle, title: product.title, price: product.priceRange?.minVariantPrice?.amount, imageUrl: product.images?.edges[0]?.node?.url });
      return;
    }
    setAddBusy((s) => ({ ...s, [product.id]: true }));
    try {
      const variantId = product.variants?.edges[0]?.node?.id;
      if (!variantId) { router.push(`/products/${product.handle}`); return; }
      const cartId = await ensureCartId();
      const res = await shopify(CART_LINES_ADD, { cartId, lines: [{ merchandiseId: variantId, quantity: 1 }] });
      const errs = res?.cartLinesAdd?.userErrors;
      if (errs?.length) throw new Error(errs.map((e) => e.message).join("; "));
      const cartData = res?.cartLinesAdd?.cart;
      try {
        window.dispatchEvent(new CustomEvent("cart:updated", { detail: { totalQuantity: cartData?.totalQuantity ?? 0 } }));
        window.dispatchEvent(new CustomEvent("cart:item-added"));
      } catch { }
      trackAddToCart({ productGid: product.id, variantGid: variantId, productTitle: product.title, price: product.priceRange?.minVariantPrice?.amount ?? '0', cartId: cartData?.id ?? cartId ?? '', quantity: 1 });
      setAddBusy((s) => ({ ...s, [product.id]: "added" }));
      setTimeout(() => setAddBusy((s) => ({ ...s, [product.id]: false })), 1200);
    } catch (e) {
      alert(e?.message || "Could not add to cart.");
      setAddBusy((s) => ({ ...s, [product.id]: false }));
    }
  }, [ensureCartId, router, openQuickBuy]);

  const handleBuyNow = useCallback(async (product) => {
    if (product.variants?.edges?.length > 1) {
      openQuickBuy({ handle: product.handle, title: product.title, price: product.priceRange?.minVariantPrice?.amount, imageUrl: product.images?.edges[0]?.node?.url });
      return;
    }
    const variantId = product.variants?.edges[0]?.node?.id;
    if (!variantId) { router.push(`/products/${product.handle}`); return; }
    setBuying((s) => ({ ...s, [product.id]: true }));
    try {
      let storedCartId = getStoredCartId();
      if (!storedCartId) {
        const res = await shopify(CART_CREATE, { lines: [{ merchandiseId: variantId, quantity: 1 }] });
        const errs = res?.cartCreate?.userErrors;
        if (errs?.length) throw new Error(errs.map((e) => e.message).join("; "));
        const newCart = res?.cartCreate?.cart;
        if (newCart?.id) setStoredCartId(newCart.id);
        await triggerGokwikOrFallback(newCart?.id, newCart?.checkoutUrl);
        return;
      }
      try {
        const res2 = await shopify(CART_LINES_ADD, { cartId: storedCartId, lines: [{ merchandiseId: variantId, quantity: 1 }] });
        const errs2 = res2?.cartLinesAdd?.userErrors;
        if (errs2?.length) throw new Error(errs2.map((e) => e.message).join("; "));
        await triggerGokwikOrFallback(storedCartId, res2?.cartLinesAdd?.cart?.checkoutUrl);
        return;
      } catch {
        clearStoredCartId();
        const createAgain = await shopify(CART_CREATE, { lines: [{ merchandiseId: variantId, quantity: 1 }] });
        const errs3 = createAgain?.cartCreate?.userErrors;
        if (errs3?.length) throw new Error(errs3.map((e) => e.message).join("; "));
        const created = createAgain?.cartCreate?.cart;
        if (created?.id) setStoredCartId(created.id);
        await triggerGokwikOrFallback(created?.id, created?.checkoutUrl);
      }
    } catch (e) {
      console.error("Buy Now error:", e);
      alert(e?.message || "Could not proceed to checkout.");
    } finally {
      setBuying((s) => ({ ...s, [product.id]: false }));
    }
  }, [triggerGokwikOrFallback, router, openQuickBuy]);

  /* ── Active sort label ── */
  const activeSortLabel = SORT_OPTIONS.find(o => o.value === sort)?.label || "Featured";

  /* ── Render ── */
  if (loading) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 py-10">
        <Skeleton className="h-4 w-48 mb-4" />
        <Skeleton className="h-10 w-72 mb-2" />
        <Skeleton className="h-4 w-80 mb-8" />
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="h-px bg-neutral-200" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 md:px-8 py-16">
        <Alert variant="destructive">
          <AlertTitle>Failed to load {isSearchMode ? "results" : "collection"}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!title && !isSearchMode) {
    return (
      <div className="mx-auto max-w-3xl px-4 md:px-8 py-16 text-center">
        <p className="text-lg">Collection not found.</p>
      </div>
    );
  }

  const effectiveDesktopBanner = bannerDesktop;
  const effectiveMobileBanner = bannerMobile || effectiveDesktopBanner;
  return (
    <div className="mx-auto max-w-full px-0 py-0">

      {/* Banner */}
      {!isSearchMode && effectiveDesktopBanner && (
        <div className="relative w-full">
          <picture>
            <source media="(max-width: 768px)" srcSet={effectiveMobileBanner} />
            <img src={effectiveDesktopBanner} alt={title} className="w-full h-auto object-cover object-top" loading="lazy" decoding="async" />
          </picture>
        </div>
      )}

      {/* ── Editorial Collection Header ── */}
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">

        {/* Title + count */}
        <div className="pt-6 sm:pt-10 pb-3 sm:pb-4">
          <h1 className="cormorant-garamond-700 text-[28px] sm:text-[36px] lg:text-[44px] leading-tight text-primary uppercase">
            {title}
          </h1>
        </div>

        {!isSearchMode && description && (
          <p className="text-[11px] sm:text-[12px] text-neutral-400 leading-snug max-w-xl montserrat-500 mb-3">
            {description}
          </p>
        )}

        {/* Category tabs */}
        {navItems.length > 0 && (
          <div className="mt-1">
            <CategoryTabs items={navItems} />
          </div>
        )}

        {/* Divider (when no tabs, sits directly under title) */}
        {navItems.length === 0 && (
          <div className="h-px bg-neutral-200 mt-1" />
        )}

        {/* FILTER | SORT BY row */}
        <div className="flex items-center justify-between py-3.5">
          <button
            onClick={() => setFilterOpen(true)}
            className="flex items-center gap-2 text-[10px] sm:text-[11px] uppercase tracking-[0.18em] montserrat-600 text-primary hover:opacity-70 transition-opacity"
          >
            <SlidersHorizontal className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={1.5} />
            Filter
            {hasActiveFilters && (
              <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: BRAND }} />
            )}
          </button>

          <div className="flex items-center gap-3">
            {/* Mobile column toggle */}
            <button
              onClick={() => setColumnsMobile(c => c === 1 ? 2 : 1)}
              className="sm:hidden p-1 text-neutral-400 hover:text-primary transition-colors"
              aria-label={columnsMobile === 1 ? "Switch to grid view" : "Switch to single column"}
            >
              {columnsMobile === 1 ? <Columns2 className="h-3.5 w-3.5" /> : <Rows2 className="h-3.5 w-3.5" />}
            </button>

            {/* Mobile: tap to open bottom sheet */}
            <button
              onClick={() => setSortOpen(true)}
              className="sm:hidden flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] montserrat-600 text-primary hover:opacity-70 transition-opacity"
            >
              {sort !== "featured" ? activeSortLabel : "Sort By"}
              <ChevronDown className="h-3 w-3 shrink-0" strokeWidth={1.5} />
            </button>

            {/* Desktop: popover dropdown */}
            <div className="hidden sm:block">
              <DesktopSortPopover sort={sort} onSortChange={setSort} />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-neutral-200" />

        {/* Active filter chips */}
        {hasActiveFilters && (
          <FilterChips
            filters={activeFilters}
            priceRange={priceRange}
            onRemovePrice={() => removeFilter("price")}
            onRemoveSize={s => removeFilter("size", s)}
            onRemoveDispatch={d => removeFilter("dispatch", d)}
            onClear={clearAllFilters}
          />
        )}
      </div>

      {/* Sidebars */}
      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        products={subcategoryProducts}
        priceRange={priceRange}
        availableSizes={availableSizes}
        initialFilters={activeFilters}
        onApply={applyFilters}
      />
      <MobileSortSheet
        open={sortOpen}
        onClose={() => setSortOpen(false)}
        sort={sort}
        onSortChange={setSort}
      />

      {/* Looks or standard product grid */}
      {!isSearchMode && looks.length > 0 ? (
        <React.Suspense fallback={null}>
          <LookCollection looks={looks} onQuickAdd={handleLookQuickAdd} />
        </React.Suspense>
      ) : (
        <div className="mx-auto max-w-[1440px] px-3 sm:px-6 lg:px-10">
          {products.length === 0 ? (
            <div className="py-24 text-center text-neutral-400">
              <p className="text-[12px] uppercase tracking-[0.12em] montserrat-500">
                {isSearchMode
                  ? "No products matched your search."
                  : hasActiveFilters
                    ? "No products match the selected filters."
                    : isFilterSubcategoryMode && activeSubSlug
                      ? "No products in this subcategory."
                      : "No products in this collection."}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="mt-4 text-[11px] uppercase tracking-[0.12em] montserrat-500 underline underline-offset-4 text-primary hover:opacity-70 transition-opacity"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div
              className={`mt-4 sm:mt-6 grid gap-3 md:gap-4 ${
                columnsMobile === 1 ? "grid-cols-1" : "grid-cols-2"
              } sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4`}
            >
              {products.map((product, index) => {
                const addState = addBusy[product.id];
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    eager={index < 4}
                    onAddToCart={handleAddToCart}
                    isAddBusy={addState === true}
                    justAdded={addState === "added"}
                    showWishlistButton
                  />
                );
              })}
            </div>
          )}

          <div ref={observerTarget} className="w-full pb-20">
            {fetchingMore && (
              <div
                className={`grid gap-3 md:gap-4 ${
                  columnsMobile === 1 ? "grid-cols-1" : "grid-cols-2"
                } sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4`}
              >
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex flex-col gap-3">
                    <AspectRatio ratio={3 / 4}>
                      <Skeleton className="h-full w-full" />
                    </AspectRatio>
                    <div className="flex flex-col items-center gap-2 px-4">
                      <Skeleton className="h-5 w-3/4 rounded-md" />
                      <Skeleton className="h-4 w-1/4 rounded-md" />
                      <Skeleton className="h-10 w-full rounded-md mt-2" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {COLLECTION_TAIL_SECTIONS.map(({ key, ...sectionProps }) => (
        <LazySection key={key} {...sectionProps} />
      ))}
    </div>
  );
}
