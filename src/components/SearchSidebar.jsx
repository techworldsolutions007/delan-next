'use client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Search, X, Clock, TrendingUp, Trash2, ArrowUpRight, RotateCw, AlertTriangle } from "lucide-react";
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

/* ---------------- small helpers ---------------- */
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

const BRAND_COLOR = "#642c44";

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
  const nav = useRouter();
  const [q, setQ] = useState("");
  const [recents, setRecents] = useState(() => loadRecents());
  const inputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [productResults, setProductResults] = useState([]);
  const [collectionResults, setCollectionResults] = useState([]);

  // prevent race conditions between fast keystrokes
  const requestIdRef = useRef(0);

  const debouncedSearch = useDebouncedCallback(async (term) => {
    const thisReq = ++requestIdRef.current;
    try {
      const variables = { query: term, first: 6 };
      const raw = await shopify(SEARCH_QUERY, variables);
      const data = await unwrapAsync(raw);

      // ignore out-of-order responses
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
      console.warn("Search failed:", e);
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
      requestIdRef.current++; // invalidate any in-flight response
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

  /* ---------------- helpers ---------------- */
  const goToSearchResults = useCallback((term) => {
    const t = String(term || "").trim();
    if (!t) return;
    pushRecent(t);
    onOpenChange?.(false);
    // 👉 Always navigate to the Search Results page that reuses the Collection layout
    nav(`/search?q=${encodeURIComponent(t)}`);
  }, [nav, onOpenChange, pushRecent]);

  /* ---------------- main goSearch (Enter / CTA) ---------------- */
  const goSearch = useCallback(
    async (term) => {
      const text = (term ?? q).trim();
      if (!text) return;
      goToSearchResults(text);
    },
    [q, goToSearchResults]
  );

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      goSearch();
    }
    if (e.key === "Escape") {
      onOpenChange?.(false);
    }
  };

  /* ---------------- popular list (configurable) ---------------- */
  const popular = useMemo(
    () => ["Dresses", "Maxi", "Co-ord", "Trousers", "XS", "Summer", "New Arrivals", "Sale"],
    []
  );

  /* ---------------- small UI: badges and thumbnails ---------------- */
  const ResultBadge = ({ kind }) => (
    <span className="text-[11px] px-2 py-0.5 rounded-full border bg-black/5 border-transparent text-neutral-700">
      {kind}
    </span>
  );

  const Skeleton = ({ className = "" }) => (
    <div className={`animate-pulse rounded-md bg-neutral-100 ${className}`} />
  );

  const StatusLine = ({ state }) => (
    <div aria-live="polite" className="sr-only">
      {state}
    </div>
  );

  const makeCardKeyHandler = (fn) => (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[92vw] sm:w-[560px] p-0 flex flex-col overflow-hidden">
        {/* Header */}
        <SheetHeader className="px-6 pb-4 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="text-lg font-medium leading-none">
              Search
            </SheetTitle>
          </div>

          {/* Input */}
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 shadow-sm bg-white">
            <Search className="h-4 w-4 text-neutral-500" />
            <div className="relative flex-1">
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                className="h-9 w-full bg-transparent outline-none text-sm px-2 pr-8 placeholder:text-neutral-400"
                placeholder="Search products or collections…"
                aria-label="Search"
              />
              {q.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  className="absolute inset-y-0 right-0 px-2 flex items-center justify-center rounded hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-300"
                  aria-label="Clear search"
                  title="Clear search"
                >
                  <X className="h-4 w-4 text-neutral-400" />
                </button>
              )}
            </div>
            {q.trim().length > 0 && (
              <Button size="lg" className="h-8" onClick={() => goSearch()}>
                Search
              </Button>
            )}
          </div>
        </SheetHeader>

        <Separator className="shrink-0" />

        {/* Body */}
        <div className="flex-1 min-h-0">
          <div className="h-full overflow-y-auto px-6 py-5 [scrollbar-gutter:stable] pr-4 overscroll-contain">
            {q.trim().length === 0 ? (
              <>
                {/* Recents + Popular */}
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Recent searches</h4>
                  {recents.length > 0 && (
                    <button
                      className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700"
                      onClick={clearRecents}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Clear
                    </button>
                  )}
                </div>

                {recents.length === 0 ? (
                  <p className="mt-2 text-sm text-neutral-500">No recent searches yet.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {recents.map((r) => (
                      <li key={r}>
                        <button
                          onClick={() => goToSearchResults(r)}
                          className="w-full flex items-center gap-3 rounded-md px-3 py-2 hover:bg-neutral-50 text-left"
                          aria-label={`Search ${r}`}
                        >
                          <Clock className="h-4 w-4 text-neutral-500" />
                          <span className="truncate text-sm">{r}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <h4 className="mt-6 text-sm font-medium">Popular right now</h4>
                <div className="mt-3 flex flex-wrap gap-2">
                  {popular.map((p) => (
                    <button
                      key={p}
                      onClick={() => goToSearchResults(p)}
                      className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs hover:bg-neutral-50 shadow-sm"
                      title={`Search ${p}`}
                      aria-label={`Open results for ${p}`}
                    >
                      <TrendingUp className="h-3.5 w-3.5 text-neutral-500" />
                      {p}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* Live action + counts */}
                <div className="rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Search className="h-4 w-4 text-neutral-500" />
                      <div>
                        <p className="text-sm">
                          Searching for <span className="font-medium">“{q.trim()}”</span>
                        </p>
                        <p className="text-xs text-neutral-500">Collections shown first</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {loading && <RotateCw className="h-4 w-4 animate-spin text-neutral-500" aria-hidden />}
                      <Button size="sm" variant="secondary" onClick={() => goSearch()} aria-label="Open results">
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  {loading ? (
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">Collections</h4>
                          <div className="text-xs text-neutral-500">Loading…</div>
                        </div>
                        <ul className="mt-3 space-y-2">
                          {Array.from({ length: 2 }).map((_, i) => (
                            <li key={i} className="w-full flex items-center gap-3 rounded-md px-3 py-2">
                              <div className="animate-pulse rounded-md bg-neutral-100 h-12 w-12" />
                              <div className="flex-1 space-y-2">
                                <div className="animate-pulse rounded-md bg-neutral-100 h-3 w-1/2" />
                                <div className="animate-pulse rounded-md bg-neutral-100 h-3 w-2/3" />
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : error ? (
                    <div className="flex items-center gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
                      <AlertTriangle className="h-4 w-4" />
                      <p className="text-sm">{error}</p>
                      <Button size="sm" variant="outline" className="ml-auto" onClick={() => debouncedSearch(q.trim())}>Try again</Button>
                    </div>
                  ) : (
                    <>
                      {/* Collections Preview */}
                      {collectionResults.length > 0 && (
                        <>
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium">Collections</h4>
                            <div className="text-xs text-neutral-500">{collectionResults.length} result{collectionResults.length !== 1 ? "s" : ""}</div>
                          </div>

                          <ul className="mt-3 space-y-2">
                            {collectionResults.map((c) => (
                              <li key={c.id}>
                                <button
                                  onClick={() => goToSearchResults(c.title)}
                                  className="w-full flex items-center gap-3 rounded-md px-3 py-2 hover:bg-neutral-50 text-left shadow-sm"
                                >
                                  <div className="relative h-12 w-12 rounded-md overflow-hidden bg-neutral-100 flex-shrink-0">
                                    {c.image ? (
                                      <Image src={c.image} alt={c.alt || c.title} fill className="object-cover" />
                                    ) : <div className="h-full w-full" />}
                                  </div>

                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 justify-between">
                                      <span className="truncate font-medium">{c.title}</span>
                                      <span className="text-[11px] px-2 py-0.5 rounded-full border bg-black/5 border-transparent text-neutral-700">Collection</span>
                                    </div>
                                    {c.description ? (
                                      <p className="text-xs text-neutral-500 truncate mt-1">{c.description}</p>
                                    ) : null}
                                  </div>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}

                      {/* Products Preview */}
                      {productResults.length > 0 && (
                        <>
                          <div className="flex items-center justify-between mt-5">
                            <h4 className="text-sm font-medium">Products</h4>
                            <div className="text-xs text-neutral-500">{productResults.length} result{productResults.length !== 1 ? "s" : ""}</div>
                          </div>

                          <ul className="mt-3 grid grid-cols-2 gap-3">
                            {productResults.map((p) => (
                              <li key={p.id}>
                                <button
                                  onClick={() => goToSearchResults(q.trim())}
                                  className="w-full rounded-lg border bg-white overflow-hidden flex items-center gap-3 p-2 hover:shadow-sm"
                                >
                                  <div className="relative h-12 w-12 rounded-md overflow-hidden bg-neutral-100 flex-shrink-0">
                                    {p.image ? (
                                      <Image src={p.image} alt={p.alt || p.title} fill className="object-cover" />
                                    ) : <div className="h-full w-full" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="truncate text-sm font-medium">{p.title}</div>
                                    <div className="text-xs text-neutral-600">
                                      {formatPrice(p.price, p.currency) ?? "Price unavailable"}
                                    </div>
                                  </div>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}

                      {collectionResults.length === 0 && productResults.length === 0 && (
                        <div className="mt-2 text-sm text-neutral-600">
                          No quick results. Click <span className="font-medium">Search</span> to see full results.
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <Separator className="shrink-0" />

        {/* Footer */}
        <SheetFooter className="px-6 pt-4 pb-6 gap-3 shrink-0">
          <Button
            className="w-full bg-primary hover:bg-primary/90"
            disabled={!q.trim().length}
            onClick={() => goSearch()}
          >
            {q.trim() ? <>Search “{q.trim()}”</> : "Search"}
          </Button>
          <Button variant="outline" className="w-full border-neutral-300" onClick={() => onOpenChange?.(false)}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
