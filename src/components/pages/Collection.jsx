'use client';
import Link from 'next/link';
import { useRouter, usePathname, useParams, useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Rows2, Columns2 } from "lucide-react";
import LazySection from "@/components/LazySection";
import ProductCard from "@/components/Product/ProductCard";
import { useQuickBuy } from "@/context/QuickBuyContext";
import { releaseFocusForCheckout } from "@/lib/checkout-helpers";
import { normalizeLooks } from "@/lib/looks";

// ✅ Queries
import { CART_CREATE, CART_LINES_ADD, GET_COLLECTION_BY_HANDLE } from "@/lib/queries";
import { shopify } from "@/lib/shopify";
import { trackAddToCart } from "@/lib/analytics";

const CART_QUERY = /* GraphQL */ `
  query CartQuery($cartId: ID!) {
    cart(id: $cartId) {
      id
      checkoutUrl
    }
  }
`;

/* 🔎 Search mode (for /search?q=...) */
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
          images(first: 2) { edges { node { url altText } } }
          priceRange { minVariantPrice { amount currencyCode } }
          variants(first: 10) { edges { node { id availableForSale quantityAvailable } } }
          metafield(namespace: "reviews", key: "rating") { value }
        }
      }
    }
  }
`;

const BRAND = "#642c44";
const CART_ID_KEY = "shopifyCartId";
const MOBILE_COLS_KEY = "collection_mobile_cols";
const PAGE_SIZE = 20; // products per page

// Map UI sort value → Shopify server-side sort args (collection products)
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

// Map UI sort value → Shopify server-side sort args (top-level product search)
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
const LookCollection = React.lazy(() => import("../Product/LookCollection"));
const SuggestionSection = React.lazy(() => import("../Product/SuggestionSection"));
const WatchAndBuy = React.lazy(() => import("../home/WatchAndBuy"));
const RecentlyViewed = React.lazy(() => import("../Product/RecentlyViewed"));
const CuratedCollections = React.lazy(() => import("../home/CuratedCollections"));

const COLLECTION_TAIL_SECTIONS = [
  {
    key: "curated-collections",
    minHeight: "65vh",
    rootMargin: "350px 0px",
    render: () => <CuratedCollections />,
  },
  {
    key: "suggestions",
    minHeight: "60vh",
    rootMargin: "350px 0px",
    render: () => <SuggestionSection />,
  },
  {
    key: "watch-and-buy",
    minHeight: "55vh",
    rootMargin: "350px 0px",
    render: () => <WatchAndBuy />,
  },
  {
    key: "recently-viewed",
    minHeight: "55vh",
    rootMargin: "350px 0px",
    render: () => <RecentlyViewed />,
  },
];

/* ----------------------------- GoKwik setup ----------------------------- */
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
  (slug || "")
    .toString()
    .trim()
    .toLowerCase();

const slugToLabel = (slug) => {
  const cleaned = (slug || "")
    .toString()
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");
  if (!cleaned) return "";
  return cleaned
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
};

const parseDisplayOrder = (raw) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((v) => NORMALIZE_SLUG(v))
        .filter(Boolean);
    }
  } catch {
    // fall through to string parsing
  }
  return raw
    .toString()
    .split(/[\n,•;|]+/g)
    .map((v) => NORMALIZE_SLUG(v))
    .filter(Boolean);
};

// Parses the custom.subcategories list metafield value into an array of
// normalised slugs. Accepts JSON arrays, or newline/comma/bullet text.
const parseListMetafield = (raw) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((v) => NORMALIZE_SLUG(v)).filter(Boolean);
    }
  } catch {
    // fall through to text splitting
  }
  return raw
    .toString()
    .split(/[\n,•;|]+/g)
    .map((v) => NORMALIZE_SLUG(v))
    .filter(Boolean);
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
      typeof showAllRaw === "string"
        ? showAllRaw.toLowerCase() === "true"
        : Boolean(showAllRaw);
    const filterNamespace = (ncRef?.filterNamespace?.value || "").toString().trim();
    const filterKey = (ncRef?.filterKey?.value || "").toString().trim();
    const displayOrderSlugs = parseDisplayOrder(ncRef?.displayOrder?.value || "");
    const childEdges = ncRef?.childCollectionsField?.references?.edges || [];
    const childCollections = childEdges
      .map((e) => e?.node)
      .filter(Boolean)
      .map((n) => ({ id: n.id, handle: n.handle, title: n.title }));
    return { mode, navTitle, showAllTab, filterNamespace, filterKey, displayOrderSlugs, childCollections };
  } catch {
    return null;
  }
}

const deriveSubcategorySlugs = (rawProducts, navConfig) => {
  const explicit = Array.isArray(navConfig?.displayOrderSlugs)
    ? navConfig.displayOrderSlugs
    : [];
  if (explicit.length) return explicit;

  const set = new Set();
  for (const p of rawProducts || []) {
    // Read from the unified subcategorySlugs array
    if (Array.isArray(p?.subcategorySlugs)) {
      for (const s of p.subcategorySlugs) set.add(s);
    }
  }
  return Array.from(set);
};

/* ─────────────────────────────────────────────────────────────────────────
 * SubcategoryStrip
 * Premium mobile-only horizontal chip strip with:
 *  • scroll-aware left/right fades
 *  • peek of next chip (intentional 20-30% cut-off)
 *  • auto-scroll active chip into view
 * ───────────────────────────────────────────────────────────────────────── */
function SubcategoryStrip({ items, activeKey, onSelect }) {
  const scrollRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const buttonRefs = useRef({});

  // Measure whether fades should be shown
  const updateFades = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 4);
    setShowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateFades();
    el.addEventListener("scroll", updateFades, { passive: true });
    const ro = new ResizeObserver(updateFades);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateFades);
      ro.disconnect();
    };
  }, [updateFades]);

  // Scroll active chip into view whenever activeKey changes
  useEffect(() => {
    const key = activeKey ?? "__all__";
    const btn = buttonRefs.current[key];
    if (btn) {
      btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [activeKey]);

  if (!items || items.length === 0) return null;

  return (
    // Outer container: visible on mobile only; desktop gets normal flow
    <div className="relative sm:hidden">
      {/* Left fade — only when scrolled past start */}
      {showLeft && (
        <div
          className="absolute left-0 top-0 bottom-[3px] w-10 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to right, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)" }}
          aria-hidden="true"
        />
      )}

      {/* Right fade — only when more content to the right */}
      {showRight && (
        <div
          className="absolute right-0 top-0 bottom-[3px] w-14 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to left, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)" }}
          aria-hidden="true"
        />
      )}

      {/* Scrollable row — padded right so last chip peeks (intentional cut-off) */}
      <div
        ref={scrollRef}
        className="flex items-center gap-2 overflow-x-auto pb-3"
        style={{
          scrollbarWidth: "none",          /* Firefox */
          msOverflowStyle: "none",         /* IE/Edge */
          /* Right padding creates the "peek" of next pill */
          paddingRight: "3.5rem",
          paddingLeft: "0px",
        }}
      >
        {items.map(({ key, label, isActive, onClick }) => (
          <button
            key={key}
            ref={(el) => { buttonRefs.current[key] = el; }}
            type="button"
            onClick={onClick}
            className={`flex-shrink-0 whitespace-nowrap px-4 py-1.5 text-sm tracking-[0.025em] uppercase font-medium rounded-full transition-colors ${isActive
              ? "bg-primary text-white"
              : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Indicator line sits BELOW chips, not overlapping */}
      <div className="h-px bg-neutral-200 opacity-60" />
    </div>
  );
}

/* Desktop-only flat strip (no fancy JS needed) */
function SubcategoryStripDesktop({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="hidden sm:block">
      <div className="flex items-center justify-center gap-2 pb-3 overflow-x-auto">
        {items.map(({ key, label, isActive, onClick }) => (
          <button
            key={key}
            type="button"
            onClick={onClick}
            className={`flex-shrink-0 whitespace-nowrap px-4 py-1.5 text-sm font-medium uppercase tracking-[0.025em] rounded-full transition-colors ${isActive
              ? "bg-primary text-white"
              : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="h-px bg-neutral-200 opacity-60" />
    </div>
  );
}




/* ── helpers ── */
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

function toProductShape(node) {
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

  // Build unified subcategorySlugs array:
  // prefer custom.subcategories (list); fall back to custom.subcategory (single).
  const listSubs = parseListMetafield(node?.subcategories?.value);
  const singleSub = NORMALIZE_SLUG(node?.subcategory?.value);
  const subcategorySlugs = listSubs.length
    ? listSubs
    : singleSub
      ? [singleSub]
      : [];

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
    // Legacy single-slug kept for any external consumers.
    subcategorySlug: subcategorySlugs[0] || "",
    // New: unified array used for all filtering.
    subcategorySlugs,
  };
}

function parseProductsFromCollection(collectionData) {
  const edges = collectionData?.products?.edges ?? [];
  return edges.map(({ node }) => toProductShape(node));
}

const getStoredCartId = () => {
  try { return localStorage.getItem(CART_ID_KEY) || null; } catch { return null; }
};
const setStoredCartId = (id) => { try { localStorage.setItem(CART_ID_KEY, id); } catch { } };
const clearStoredCartId = () => { try { localStorage.removeItem(CART_ID_KEY); } catch { } };

/* -------------------------------- main ------------------------------- */
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

  // True when the server passed a pre-fetched collection payload
  const hasServerData = !!initialData?.collection;
  // Ref tracks whether we've consumed the server data on the initial mount;
  // after that, every sort/handle change triggers a normal client fetch.
  const serverDataUsedRef = useRef(false);

  const [loading, setLoading] = useState(!hasServerData);
  const [title, setTitle] = useState(() => initialData?.collection?.title || "");
  const [description, setDescription] = useState(() => initialData?.collection?.description || "");
  const [bannerImage, setBannerImage] = useState(() => initialData?.collection?.image?.url || "");
  const [bannerDesktop, setBannerDesktop] = useState(() => initialData?.collection?.desktopBanner?.reference?.image?.url || "");
  const [bannerMobile, setBannerMobile] = useState(() => initialData?.collection?.mobileBanner?.reference?.image?.url || "");
  const [rawProducts, setRawProducts] = useState(() =>
    hasServerData ? parseProductsFromCollection(initialData.collection) : []
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

  const [sort, setSort] = useState("date-desc");
  // changed: split Add and Buy busy states
  const [addBusy, setAddBusy] = useState({});   // { [productId]: boolean | "added" }
  const [buying, setBuying] = useState({});     // { [productId]: boolean }

  // 1 or 2 columns on mobile
  const [columnsMobile, setColumnsMobile] = useState(2);

  // we no longer use manual pagination pages
  // const [currentPage, setCurrentPage] = useState(1);

  // GoKwik SDK state (optional, useful for debugging)
  const [gokwikReady, setGokwikReady] = useState(false);

  // Scroll direction for sticky subcategory strip
  const [showHeader, setShowHeader] = useState(true);
  const [lastY, setLastY] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y > lastY && y > 50) setShowHeader(false);
      else setShowHeader(true);
      setLastY(y);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [lastY]);

  // read persisted mobile layout
  useEffect(() => {
    try {
      const val = Number(localStorage.getItem(MOBILE_COLS_KEY));
      if (val === 1 || val === 2) setColumnsMobile(val);
    } catch { }
  }, []);
  // persist on change
  useEffect(() => {
    try { localStorage.setItem(MOBILE_COLS_KEY, String(columnsMobile)); } catch { }
  }, [columnsMobile]);

  // load products (collection or search mode)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // On initial mount, skip client fetch — state is already hydrated from server data
      if (!isSearchMode && hasServerData && !serverDataUsedRef.current) {
        serverDataUsedRef.current = true;
        return;
      }
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

          setTitle(`Search results for “${qParam}”`);
          setDescription("");
          setBannerImage("");
          setBannerDesktop("");
          setBannerMobile("");
          setRawProducts(prods);
          setHasNextPage(pageInfo?.hasNextPage || false);
          setEndCursor(pageInfo?.endCursor || null);
        } else {
          // Fetch only the first batch (Lazy Load)
          const collectionArgs = getCollectionSortArgs(sort);
          const data = await shopify(GET_COLLECTION_BY_HANDLE, {
            handle,
            first: 20,
            after: null,
            ...collectionArgs,
          });
          if (cancelled) return;

          const col = data?.collection;
          if (!col) {
            setTitle("");
            setRawProducts([]);
            return;
          }

          const featured = col.image?.url || "";
          const desktop = col.desktopBanner?.reference?.image?.url || "";
          const mobile = col.mobileBanner?.reference?.image?.url || "";

          setTitle(col.title || "");
          setDescription(col.description || "");
          setBannerImage(featured);
          setBannerDesktop(desktop);
          setBannerMobile(mobile);

          setNavConfig(parseNavConfig(col));
          setLooks(normalizeLooks(col));

          const pageProducts = parseProductsFromCollection(col);
          const pageInfo = col.products?.pageInfo;

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
  const subParamRaw = !isSearchMode
    ? searchParams.get("sub")
    : null;
  const activeSubSlug = !isSearchMode ? NORMALIZE_SLUG(subParamRaw) : null;

  const isFilterSubcategoryMode =
    !isSearchMode && navConfig?.mode === "filter_subcategory";

  const subcategorySlugs = useMemo(
    () => deriveSubcategorySlugs(rawProducts, navConfig),
    [rawProducts, navConfig]
  );

  // Server-side sort is applied in the fetch. Only client-side subcategory filter remains.
  const products = useMemo(() => {
    let arr = rawProducts;

    if (isFilterSubcategoryMode && activeSubSlug) {
      if (subcategorySlugs.length === 0) {
        arr = [];
      } else if (subcategorySlugs.includes(activeSubSlug)) {
        arr = arr.filter(
          (p) =>
            Array.isArray(p?.subcategorySlugs) &&
            p.subcategorySlugs.includes(activeSubSlug)
        );
      } else {
        arr = [];
      }
    }

    return arr;
  }, [rawProducts, isFilterSubcategoryMode, activeSubSlug, subcategorySlugs]);

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
          const prods = parseProductsFromCollection(col);
          const pageInfo = col.products?.pageInfo;
          setRawProducts(prev => [...prev, ...prods]);
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

  // Infinite scroll intersection observer
  const observerTarget = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !fetchingMore) {
          handleLoadMore();
        }
      },
      { threshold: 1.0, rootMargin: "200px" }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, fetchingMore, handleLoadMore]);

  // products memo – since it's infinite scroll, we show the full accumulated array
  // (we no longer slice by currentPage)
  const pagedProducts = products;

  const handleSubcategoryClick = useCallback(
    (slug) => {
      if (isSearchMode) return;
      const newParams = new URLSearchParams(searchParams.toString());
      if (!slug) {
        newParams.delete("sub");
      } else {
        newParams.set("sub", NORMALIZE_SLUG(slug));
      }
      const search = newParams.toString();
      router.push(`${pathname}${search ? `?${search}` : ""}`);
      // Scroll to the top of the collection to restart browsing smoothly
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [isSearchMode, pathname, searchParams, router]
  );

  const handleChildCollectionClick = useCallback(
    (childHandle) => {
      if (!childHandle) return;
      router.push(`/collections/${childHandle}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [router]
  );

  // cart helpers
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

  const handleLookQuickAdd = useCallback(
    async (product) => {
      const isSingleVariant = product.variants?.length <= 1;
      if (!isSingleVariant) {
        openQuickBuy({
          handle: product.handle,
          title: product.title,
          price: product.priceRange?.minVariantPrice?.amount,
          imageUrl: product.imageUrl,
        });
        return;
      }

      const variantId = product.variants[0]?.id;
      if (!variantId) {
        router.push(`/products/${product.handle}`);
        return;
      }

      setAddBusy((s) => ({ ...s, [product.id]: true }));
      try {
        const cartId = await ensureCartId();
        const res = await shopify(CART_LINES_ADD, {
          cartId,
          lines: [{ merchandiseId: variantId, quantity: 1 }],
        });
        const errs = res?.cartLinesAdd?.userErrors;
        if (errs?.length) throw new Error(errs.map((e) => e.message).join('; '));
        const cartData = res?.cartLinesAdd?.cart;
        window.dispatchEvent(
          new CustomEvent('cart:updated', { detail: { totalQuantity: cartData?.totalQuantity ?? 0 } })
        );
        window.dispatchEvent(new CustomEvent('cart:item-added'));
        trackAddToCart({
          productGid: product.id,
          variantGid: variantId,
          productTitle: product.title,
          price: product.priceRange?.minVariantPrice?.amount ?? '0',
          cartId: cartData?.id ?? cartId ?? '',
          quantity: 1,
        });
        setAddBusy((s) => ({ ...s, [product.id]: 'added' }));
        setTimeout(() => setAddBusy((s) => ({ ...s, [product.id]: false })), 1200);
      } catch (e) {
        alert(e?.message || 'Could not add to cart.');
        setAddBusy((s) => ({ ...s, [product.id]: false }));
      }
    },
    [ensureCartId, openQuickBuy, router]
  );

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

  const triggerGokwikOrFallback = useCallback(
    async (cartId, maybeCheckoutUrl) => {
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
    },
    []
  );

  const handleAddToCart = useCallback(
    async (product) => {
      // If multiple variants, open Quick Buy
      if (product.variants?.edges?.length > 1) {
        openQuickBuy({
          handle: product.handle,
          title: product.title,
          price: product.priceRange?.minVariantPrice?.amount,
          imageUrl: product.images?.edges[0]?.node?.url,
        });
        return;
      }

      setAddBusy((s) => ({ ...s, [product.id]: true }));
      try {
        const variantId = product.variants?.edges[0]?.node?.id;
        if (!variantId) {
          router.push(`/products/${product.handle}`);
          return;
        }

        const cartId = await ensureCartId();
        const res = await shopify(CART_LINES_ADD, {
          cartId,
          lines: [{ merchandiseId: variantId, quantity: 1 }],
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
          variantGid: variantId,
          productTitle: product.title,
          price: product.priceRange?.minVariantPrice?.amount ?? '0',
          cartId: cartData?.id ?? cartId ?? '',
          quantity: 1,
        });

        setAddBusy((s) => ({ ...s, [product.id]: "added" }));
        setTimeout(() => {
          setAddBusy((s) => ({ ...s, [product.id]: false }));
        }, 1200);
      } catch (e) {
        alert(e?.message || "Could not add to cart.");
        setAddBusy((s) => ({ ...s, [product.id]: false }));
      }
    },
    [ensureCartId, router, openQuickBuy]
  );

  const handleBuyNow = useCallback(
    async (product) => {
      // If multiple variants, open Quick Buy
      if (product.variants?.edges?.length > 1) {
        openQuickBuy({
          handle: product.handle,
          title: product.title,
          price: product.priceRange?.minVariantPrice?.amount,
          imageUrl: product.images?.edges[0]?.node?.url,
        });
        return;
      }

      const variantId = product.variants?.edges[0]?.node?.id;
      if (!variantId) {
        router.push(`/products/${product.handle}`);
        return;
      }

      setBuying((s) => ({ ...s, [product.id]: true }));
      try {
        let storedCartId = getStoredCartId();

        if (!storedCartId) {
          const res = await shopify(CART_CREATE, {
            lines: [{ merchandiseId: variantId, quantity: 1 }],
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
            lines: [{ merchandiseId: variantId, quantity: 1 }],
          });
          const errs2 = res2?.cartLinesAdd?.userErrors;
          if (errs2?.length) throw new Error(errs2.map((e) => e.message).join("; "));
          const checkoutUrl = res2?.cartLinesAdd?.cart?.checkoutUrl;
          await triggerGokwikOrFallback(storedCartId, checkoutUrl);
          return;
        } catch (innerErr) {
          clearStoredCartId();
          const createAgain = await shopify(CART_CREATE, {
            lines: [{ merchandiseId: variantId, quantity: 1 }],
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
    [triggerGokwikOrFallback, router, openQuickBuy]
  );

  /* ----------------------------- render ----------------------------- */
  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 md:px-8 py-10">
        <Skeleton className="h-64 w-full mb-8" />
        <div className="flex items-end justify-between mb-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-36" />
        </div>
        <Separator />
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
    <div className="mx-auto max-w-full px-0 md:px-0 py-0">
      {/* Banner (skip for search mode) */}
      {!isSearchMode && effectiveDesktopBanner && (
        <div className="relative w-full">
          <picture>
            {/* Mobile first */}
            <source
              media="(max-width: 768px)"
              srcSet={effectiveMobileBanner}
            />
            {/* Desktop / default */}
            <img
              src={effectiveDesktopBanner}
              alt={title}
              className="w-full h-auto object-cover object-top"
              loading="lazy"
              decoding="async"
            />
          </picture>

          {/* <div className="absolute inset-0 flex flex-col bg-black/30 justify-center items-center text-center px-6">
            <h1 className="cormorant-garamond-700 uppercase text-3xl md:text-4xl lg:text-4xl text-accent drop-shadow-lg">
              {title}
            </h1>
            {description && (
              <p className="mt-3 max-w-3xl text-sm md:text-base text-gray-100">
                {description}
              </p>
            )}
          </div> */}
        </div>
      )}

      {/* ===== Features (controls) ===== */}
      <div className="w-full px-3 md:px-6 pt-8 pb-2">
        <h1 className="cormorant-garamond-700 uppercase text-primary text-3xl md:text-4xl lg:text-4xl text-center sm:text-start">
          {title}
        </h1>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-neutral-500 text-center sm:text-left">
            {products.length} item{products.length === 1 ? "" : "s"}
          </p>

          {/* Right-side controls group */}
          <div className="flex items-center justify-center sm:justify-end gap-3">
            {/* Sort (always visible) */}
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-44 h-10">
                <SelectValue placeholder="Featured" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="date-desc">Newest First</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="title-asc">Title: A–Z</SelectItem>
                <SelectItem value="title-desc">Title: Z–A</SelectItem>
              </SelectContent>
            </Select>

            {/* View dropdown — MOBILE ONLY (icon only in trigger to avoid duplication) */}
            <div className="block sm:hidden">
              <Select
                value={String(columnsMobile)}
                onValueChange={(v) => setColumnsMobile(Number(v))}
              >
                <SelectTrigger className="w-44 h-10 pl-9 relative">
                  {/* current icon in trigger */}
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true">
                    {columnsMobile === 1 ? (
                      <Rows2 className="h-4 w-4 text-primary" />
                    ) : (
                      <Columns2 className="h-4 w-4 text-primary" />
                    )}
                  </span>
                  {/* Only text comes from SelectValue so there is no second icon */}
                  <SelectValue
                    placeholder="View"
                    aria-label={`View: ${columnsMobile} per row`}
                  />
                </SelectTrigger>
                <SelectContent>
                  {/* Text-only items to prevent icon duplication in the trigger */}
                  <SelectItem value="1">List View</SelectItem>
                  <SelectItem value="2">Grid View</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* We moved the subcategory strip out to be a sibling so it can stick properly */}
        {(!navConfig || isSearchMode) && <Separator className="mt-4" />}
      </div>
      {/* ===== /Features ===== */}

      {/* Subcategory / child collection strip (Sticky) */}
      {!isSearchMode && navConfig && (() => {
        // Build a unified items list for the two strip variants
        let items = [];

        if (navConfig.mode === "filter_subcategory" && subcategorySlugs.length > 0) {
          if (navConfig.showAllTab) {
            items.push({
              key: "__all__",
              label: "View All",
              isActive: !activeSubSlug,
              onClick: () => handleSubcategoryClick(null),
            });
          }
          subcategorySlugs.forEach((slug) => {
            items.push({
              key: slug,
              label: slugToLabel(slug),
              isActive: activeSubSlug === slug,
              onClick: () => handleSubcategoryClick(slug),
            });
          });
        } else if (
          navConfig.mode === "child_collections" &&
          Array.isArray(navConfig.childCollections) &&
          navConfig.childCollections.length > 0
        ) {
          if (navConfig.showAllTab) {
            items.push({
              key: "__all__",
              label: "View All",
              isActive: false,
              onClick: () => { router.push(`/collections/${handle}`); window.scrollTo({ top: 0, behavior: "smooth" }); },
            });
          }
          navConfig.childCollections.forEach((col) => {
            items.push({
              key: col.id,
              label: col.title,
              isActive: false,
              onClick: () => handleChildCollectionClick(col.handle),
            });
          });
        }

        if (items.length === 0) return null;
        const activeKey = items.find((i) => i.isActive)?.key ?? null;

        return (
          <div
            className={`bg-white/95 backdrop-blur-md z-40 transition-transform duration-300 sm:static sticky ${showHeader ? "top-[76px] sm:top-[80px]" : "top-0"
              }`}
          >
            <div className="w-full px-3 md:px-6 pt-3">
              {/* Mobile strip */}
              <SubcategoryStrip items={items} activeKey={activeKey} />
              {/* Desktop strip */}
              <SubcategoryStripDesktop items={items} />
            </div>
          </div>
        );
      })()}

      {/* Looks view — replaces product grid when collection has looks */}
      {!isSearchMode && looks.length > 0 ? (
        <React.Suspense fallback={null}>
          <LookCollection looks={looks} onQuickAdd={handleLookQuickAdd} />
        </React.Suspense>
      ) : (
        /* Standard product grid */
        <div className="w-full px-3 md:px-6">
          {products.length === 0 ? (
            <div className="py-20 text-center text-neutral-600">
              {isSearchMode
                ? "No products matched your search."
                : isFilterSubcategoryMode && activeSubSlug
                  ? "No products in this subcategory."
                  : "No products in this collection."}
            </div>
          ) : (
            <div
              className={`mt-3 grid gap-3 md:gap-4 ${columnsMobile === 1 ? "grid-cols-1" : "grid-cols-2"
                } sm:grid-cols-3 lg:grid-cols-4`}
            >
              {pagedProducts.map((product, index) => {
                const addState = addBusy[product.id];
                const isAddBusy = addState === true;
                const justAdded = addState === "added";

                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    eager={index < 6}
                    onAddToCart={handleAddToCart}
                    isAddBusy={isAddBusy}
                    justAdded={justAdded}
                    showWishlistButton
                  />
                );
              })}
            </div>
          )}

          {/* Trigger for Infinite Scroll / Skeleton Loading */}
          <div ref={observerTarget} className="w-full pb-20">
            {fetchingMore && (
              <div
                className={`grid gap-3 md:gap-4 ${columnsMobile === 1 ? "grid-cols-1" : "grid-cols-2"
                  } sm:grid-cols-3 lg:grid-cols-4`}
              >
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <AspectRatio ratio={3 / 4}>
                      <Skeleton className="h-full w-full" />
                    </AspectRatio>
                    <div className="flex flex-col gap-1.5 px-1">
                      <Skeleton className="h-3 w-3/4 rounded-sm" />
                      <Skeleton className="h-3 w-1/4 rounded-sm" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Additional sections */}
      {
        COLLECTION_TAIL_SECTIONS.map(({ key, ...sectionProps }) => (
          <LazySection key={key} {...sectionProps} />
        ))
      }
    </div >
  );
}
