'use client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Search, X, Clock, TrendingUp, Trash2, ArrowRight, RotateCw, AlertTriangle, ChevronRight } from "lucide-react";
import { shopify } from "@/lib/shopify";

/* ---------------- storage & constants ---------------- */
const RECENT_KEY = "delanRecentSearches";
const MAX_RECENTS = 8;

function loadRecents() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveRecents(list) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENTS)));
  } catch {}
}

/* ---------------- GraphQL search (products + collections) ---------------- */
const SEARCH_QUERY = /* GraphQL */ `
  query SearchBoth($query: String!, $first: Int!) {
    products(first: $first, query: $query) {
      edges {
        node {
          id
          title
          handle
          priceRange { minVariantPrice { amount currencyCode } }
          images(first: 1) { edges { node { url altText } } }
          variants(first: 1) { edges { node { availableForSale } } }
        }
      }
    }
    collections(first: $first, query: $query) {
      edges {
        node {
          id
          title
          handle
          description
          image { url altText }
        }
      }
    }
  }
`;

/* ---------------- helpers ---------------- */
async function unwrapAsync(resp) {
  let r = resp;
  if (r && typeof r.json === "function") {
    try { r = await r.json(); } catch {}
  }
  const body = r?.data ?? r;
  if (Array.isArray(r?.errors) && r.errors.length) {
    throw new Error(r.errors.map((e) => e.message).join("; "));
  }
  return body;
}

function formatPrice(amount, currency) {
  if (!amount) return null;
  const value = Number.parseFloat(amount);
  if (!Number.isFinite(value)) return null;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "INR", maximumFractionDigits: 0 }).format(value);
  } catch {
    return `₹${value.toFixed(0)}`;
  }
}

function useDebouncedCallback(cb, delay) {
  const t = useRef(null);
  const saved = useRef(cb);
  useEffect(() => { saved.current = cb; }, [cb]);
  return useCallback((...args) => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => saved.current(...args), delay);
  }, [delay]);
}

/* ---------------- component ---------------- */
export default function SearchSidebar({ open, onOpenChange }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [recents, setRecents] = useState(() => loadRecents());
  const inputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [productResults, setProductResults] = useState([]);
  const [collectionResults, setCollectionResults] = useState([]);

  const requestIdRef = useRef(0);

  const debouncedSearch = useDebouncedCallback(async (term) => {
    const thisReq = ++requestIdRef.current;
    try {
      const variables = { query: term, first: 5 };
      const raw = await shopify(SEARCH_QUERY, variables);
      const data = await unwrapAsync(raw);

      if (thisReq !== requestIdRef.current) return;

      const prodEdges = data?.products?.edges ?? [];
      const colEdges = data?.collections?.edges ?? [];

      const prods = prodEdges.map(({ node }) => {
        const img = node?.images?.edges?.[0]?.node;
        return {
          id: node.id,
          title: node.title,
          handle: node.handle,
          price: node?.priceRange?.minVariantPrice?.amount ?? null,
          currency: node?.priceRange?.minVariantPrice?.currencyCode ?? null,
          image: img?.url ?? null,
          alt: img?.altText ?? node.title,
          available: node?.variants?.edges?.[0]?.node?.availableForSale ?? true,
        };
      });

      const cols = colEdges.map(({ node }) => ({
        id: node.id,
        title: node.title,
        handle: node.handle,
        description: node.description || "",
        image: node?.image?.url ?? null,
        alt: node?.image?.altText ?? node.title,
      }));

      setProductResults(prods);
      setCollectionResults(cols);
      setError("");
    } catch (e) {
      if (thisReq !== requestIdRef.current) return;
      setError(e?.message || "Search failed");
      setProductResults([]);
      setCollectionResults([]);
    } finally {
      if (thisReq === requestIdRef.current) setLoading(false);
    }
  }, 300);

  /* ---------------- open/close lifecycle ---------------- */
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQ("");
      setProductResults([]);
      setCollectionResults([]);
      setError("");
      setLoading(false);
      requestIdRef.current++;
    }
  }, [open]);

  const canSearch = useMemo(() => q.trim().length > 0, [q]);

  const pushRecent = useCallback(
    (term) => {
      const t = String(term || "").trim();
      if (!t) return;
      const next = [t, ...recents.filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, MAX_RECENTS);
      setRecents(next);
      saveRecents(next);
    },
    [recents]
  );

  const clearRecents = () => {
    setRecents([]);
    saveRecents([]);
  };

  /* ---------------- debounced live search ---------------- */
  useEffect(() => {
    if (!open) return;
    if (!canSearch) {
      setProductResults([]);
      setCollectionResults([]);
      setLoading(false);
      setError("");
      requestIdRef.current++;
      return;
    }

    setLoading(true);
    setError("");
    debouncedSearch(q.trim());
  }, [q, open, canSearch, debouncedSearch]);

  /* ---------------- navigation helpers ---------------- */
  const close = useCallback(() => onOpenChange?.(false), [onOpenChange]);

  /* Navigate to full search results page */
  const goToSearchPage = useCallback((term) => {
    const t = String(term || "").trim();
    if (!t) return;
    pushRecent(t);
    close();
    router.push(`/search?q=${encodeURIComponent(t)}`);
  }, [router, close, pushRecent]);

  /* Navigate to a collection page */
  const goToCollection = useCallback((handle, title) => {
    if (title) pushRecent(title);
    close();
    router.push(`/collections/${handle}`);
  }, [router, close, pushRecent]);

  /* Navigate to a product page */
  const goToProduct = useCallback((handle, title) => {
    if (title) pushRecent(title);
    close();
    router.push(`/products/${handle}`);
  }, [router, close, pushRecent]);

  /* Enter key / Search CTA */
  const goSearch = useCallback(() => {
    const text = q.trim();
    if (!text) return;
    goToSearchPage(text);
  }, [q, goToSearchPage]);

  const onKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); goSearch(); }
    if (e.key === "Escape") close();
  };

  /* ---------------- popular tags ---------------- */
  const popular = useMemo(
    () => ["Dresses", "Maxi", "Co-ord", "Trousers", "XS", "Summer", "New Arrivals", "Sale"],
    []
  );

  const hasResults = collectionResults.length > 0 || productResults.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[92vw] sm:w-[520px] p-0 flex flex-col overflow-hidden bg-white">

        {/* ── Header ── */}
        <SheetHeader className="px-5 pt-5 pb-4 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <SheetTitle className="cormorant-garamond-700 text-[22px] text-primary tracking-wide uppercase leading-none">
              Search
            </SheetTitle>
            <button
              onClick={close}
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors"
              aria-label="Close search"
            >
              <X className="h-4 w-4 text-neutral-500" />
            </button>
          </div>

          {/* Search input */}
          <div className="flex items-center gap-2 border border-neutral-200 rounded-none px-4 py-3 bg-white focus-within:border-primary transition-colors">
            <Search className="h-4 w-4 text-neutral-400 shrink-0" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-neutral-400 text-neutral-800"
              placeholder="Search styles, collections…"
              aria-label="Search"
            />
            {loading && <RotateCw className="h-3.5 w-3.5 animate-spin text-neutral-400 shrink-0" aria-hidden />}
            {q.trim().length > 0 && !loading && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="h-5 w-5 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors shrink-0"
                aria-label="Clear"
              >
                <X className="h-3 w-3 text-neutral-400" />
              </button>
            )}
            {canSearch && (
              <button
                type="button"
                onClick={goSearch}
                className="h-7 w-7 flex items-center justify-center bg-primary text-white rounded-full hover:bg-primary/90 transition-colors shrink-0"
                aria-label="Search"
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </SheetHeader>

        <Separator className="shrink-0" />

        {/* ── Body ── */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">

          {/* ── Empty state: recents + popular ── */}
          {!canSearch ? (
            <div className="px-5 py-5">
              {/* Recents */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase tracking-[0.18em] montserrat-600 text-neutral-400">Recent</span>
                {recents.length > 0 && (
                  <button
                    onClick={clearRecents}
                    className="inline-flex items-center gap-1 text-[10px] text-neutral-400 hover:text-primary transition-colors montserrat-500 uppercase tracking-[0.1em]"
                  >
                    <Trash2 className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>

              {recents.length === 0 ? (
                <p className="text-sm text-neutral-400 montserrat-500 mb-6">No recent searches yet.</p>
              ) : (
                <ul className="mb-6 divide-y divide-neutral-50">
                  {recents.map((r) => (
                    <li key={r}>
                      <button
                        onClick={() => goToSearchPage(r)}
                        className="w-full flex items-center gap-3 py-2.5 hover:text-primary transition-colors text-left group"
                      >
                        <Clock className="h-3.5 w-3.5 text-neutral-300 group-hover:text-primary/50 shrink-0" />
                        <span className="flex-1 truncate text-sm montserrat-500 text-neutral-600 group-hover:text-primary">{r}</span>
                        <ArrowRight className="h-3 w-3 text-neutral-200 group-hover:text-primary/60 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Popular */}
              <div className="mb-3">
                <span className="text-[10px] uppercase tracking-[0.18em] montserrat-600 text-neutral-400">Trending Now</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {popular.map((p) => (
                  <button
                    key={p}
                    onClick={() => goToSearchPage(p)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 text-[11px] montserrat-500 text-neutral-600 hover:border-primary hover:text-primary hover:bg-primary/[0.03] transition-all"
                  >
                    <TrendingUp className="h-3 w-3" />
                    {p}
                  </button>
                ))}
              </div>
            </div>

          ) : (
            /* ── Live results ── */
            <div className="px-5 py-4">
              {error ? (
                <div className="flex items-center gap-3 border border-red-200 bg-red-50 p-3 text-red-700 rounded-none">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <p className="text-sm flex-1">{error}</p>
                  <button
                    className="text-xs underline underline-offset-2 hover:no-underline shrink-0"
                    onClick={() => debouncedSearch(q.trim())}
                  >
                    Retry
                  </button>
                </div>
              ) : loading ? (
                /* Skeleton */
                <div className="space-y-5">
                  <div>
                    <div className="h-3 w-24 bg-neutral-100 rounded animate-pulse mb-3" />
                    <div className="space-y-2">
                      {[1, 2].map(i => (
                        <div key={i} className="flex items-center gap-3 py-2">
                          <div className="h-14 w-14 bg-neutral-100 rounded animate-pulse shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 bg-neutral-100 rounded animate-pulse w-2/3" />
                            <div className="h-2.5 bg-neutral-100 rounded animate-pulse w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="h-3 w-20 bg-neutral-100 rounded animate-pulse mb-3" />
                    <div className="grid grid-cols-2 gap-3">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="border border-neutral-100 p-2">
                          <div className="aspect-[3/4] bg-neutral-100 rounded animate-pulse mb-2" />
                          <div className="h-2.5 bg-neutral-100 rounded animate-pulse w-3/4 mb-1.5" />
                          <div className="h-2.5 bg-neutral-100 rounded animate-pulse w-1/3" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : !hasResults ? (
                /* No results */
                <div className="py-16 text-center">
                  <Search className="h-8 w-8 text-neutral-200 mx-auto mb-4" />
                  <p className="text-sm montserrat-500 text-neutral-500 mb-1">No results for</p>
                  <p className="text-base montserrat-600 text-primary mb-5">"{q.trim()}"</p>
                  <p className="text-xs text-neutral-400 montserrat-500 mb-5">Try a different spelling or browse our collections below.</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {popular.slice(0, 4).map((p) => (
                      <button
                        key={p}
                        onClick={() => goToSearchPage(p)}
                        className="px-3 py-1.5 border border-neutral-200 text-[11px] montserrat-500 text-neutral-600 hover:border-primary hover:text-primary transition-all"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* Collections */}
                  {collectionResults.length > 0 && (
                    <section className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] uppercase tracking-[0.18em] montserrat-600 text-neutral-400">Collections</span>
                        <span className="text-[10px] text-neutral-300 montserrat-500">{collectionResults.length} found</span>
                      </div>
                      <ul className="divide-y divide-neutral-50">
                        {collectionResults.map((c) => (
                          <li key={c.id}>
                            <button
                              onClick={() => goToCollection(c.handle, c.title)}
                              className="w-full flex items-center gap-3 py-2.5 hover:text-primary transition-colors text-left group"
                            >
                              <div className="relative h-14 w-14 overflow-hidden bg-neutral-50 shrink-0">
                                {c.image ? (
                                  <Image src={c.image} alt={c.alt || c.title} fill className="object-cover" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center">
                                    <Search className="h-5 w-5 text-neutral-200" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm montserrat-600 text-neutral-800 group-hover:text-primary truncate transition-colors">{c.title}</p>
                                {c.description && (
                                  <p className="text-[11px] text-neutral-400 montserrat-500 truncate mt-0.5">{c.description}</p>
                                )}
                              </div>
                              <ChevronRight className="h-3.5 w-3.5 text-neutral-300 group-hover:text-primary/60 shrink-0 transition-colors" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {/* Products */}
                  {productResults.length > 0 && (
                    <section className="mb-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] uppercase tracking-[0.18em] montserrat-600 text-neutral-400">Products</span>
                        <span className="text-[10px] text-neutral-300 montserrat-500">{productResults.length} found</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {productResults.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => goToProduct(p.handle, p.title)}
                            className="group text-left border border-neutral-100 hover:border-primary/30 transition-all overflow-hidden"
                          >
                            <div className="relative aspect-[3/4] w-full bg-neutral-50 overflow-hidden">
                              {p.image ? (
                                <Image
                                  src={p.image}
                                  alt={p.alt || p.title}
                                  fill
                                  className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                  <Search className="h-6 w-6 text-neutral-200" />
                                </div>
                              )}
                              {!p.available && (
                                <div className="absolute inset-0 bg-white/60 flex items-end justify-center pb-2">
                                  <span className="text-[9px] uppercase tracking-[0.12em] montserrat-600 text-neutral-500">Sold Out</span>
                                </div>
                              )}
                            </div>
                            <div className="px-2.5 py-2.5">
                              <p className="text-[12px] montserrat-500 text-neutral-800 truncate leading-snug group-hover:text-primary transition-colors">{p.title}</p>
                              <p className="text-[11px] montserrat-600 text-primary mt-0.5">
                                {formatPrice(p.price, p.currency) ?? "—"}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* View all results CTA */}
                  <button
                    onClick={goSearch}
                    className="w-full flex items-center justify-center gap-2 py-3.5 border border-primary text-primary text-[11px] uppercase tracking-[0.18em] montserrat-600 hover:bg-primary hover:text-white transition-all group mt-1"
                  >
                    View all results for "{q.trim()}"
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Footer CTA (only when query typed) ── */}
        {canSearch && (
          <>
            <Separator className="shrink-0" />
            <div className="px-5 py-4 shrink-0">
              <button
                onClick={goSearch}
                className="w-full h-14 flex items-center justify-center gap-2 rounded-[12px] bg-primary text-white text-[15px] font-bold uppercase tracking-[0.15em] transition-all duration-300 active:scale-[0.98] shadow-sm hover:shadow-md hover:brightness-110"
              >
                <Search className="h-4 w-4" />
                Search "{q.trim()}"
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
