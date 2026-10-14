'use client';
import { useParams } from 'next/navigation';
// src/components/ReviewList.jsx
import React from "react";
import { shopify } from "@/lib/shopify";
import { GET_PRODUCT_REVIEWS } from "@/lib/queries";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Star } from "lucide-react";

const BRAND = "var(--brand-642, #642c44)";

/* ===================== Stars (lucide) with fractional fill ===================== */
function RatingStars({
  value = 0,
  size = 16,
  className = "",
  "aria-label": ariaLabel,
}) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));

  return (
    <div
      className={`flex items-center gap-[2px] ${className}`}
      aria-label={ariaLabel ?? `${v} out of 5 stars`}
    >
      {Array.from({ length: 5 }).map((_, i) => {
        // fraction for this star (0..1)
        const f = Math.max(0, Math.min(1, v - i));
        // base outline
        return (
          <span
            key={i}
            className="relative inline-block"
            style={{ width: size, height: size }}
          >
            {/* base outline (empty) */}
            <Star size={size} className="text-muted-foreground/40" aria-hidden />
            {/* filled portion, clipped */}
            {f > 0 && (
              <span
                className="absolute left-0 top-0 overflow-hidden"
                style={{ width: `${f * 100}%`, height: size }}
                aria-hidden
              >
                <Star
                  size={size}
                  className="text-[color:var(--brand-642, #642c44)]"
                  fill="currentColor"
                />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

/* ============================ helpers / summarize ============================= */
function coalesceAuthor(r = {}) {
  return r.firstName || r.author || r.name || r.user || "Valued Customer";
}
function coalesceText(r = {}) {
  return r.text || r.body || r.content || "";
}
function parseDateSafe(v) {
  const d = v ? new Date(v) : null;
  return d && !isNaN(d) ? d : null;
}
function summarize(reviews = []) {
  if (!reviews.length) return { avg: 0, total: 0, buckets: [0, 0, 0, 0, 0] };
  const buckets = [0, 0, 0, 0, 0];
  const sum = reviews.reduce((s, r) => {
    const rate = Number(r.rate || 0);
    const idx = Math.max(1, Math.min(5, Math.round(rate))) - 1;
    buckets[idx] += 1;
    return s + rate;
  }, 0);
  return { avg: +(sum / reviews.length).toFixed(1), total: reviews.length, buckets };
}

function Avatar({ name = "User" }) {
  const initials = (name || "U")
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || "")
    .join("");
  return (
    <div
      className="grid h-10 w-10 place-items-center rounded-full text-[13px] font-semibold"
      style={{
        backgroundColor: "rgba(100,44,68,0.12)",
        color: "var(--brand-642, #642c44)",
      }}
      aria-hidden
    >
      {initials || "U"}
    </div>
  );
}

/* ================================== main ================================== */
export default function ReviewList({
  metafieldNamespace = "air_reviews_product",
  metafieldKey = "data",
  initialCount = 4,
  loadMoreStep = 4,
  showSummary = true,
  showHistogram = true,
}) {
  const { handle } = useParams();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [reviews, setReviews] = React.useState([]);
  const [visible, setVisible] = React.useState(initialCount);
  const [sort, setSort] = React.useState("recent"); // recent | highest | lowest
  const [expanded, setExpanded] = React.useState({}); // idx -> boolean
  const [starFilter, setStarFilter] = React.useState(null); // 1..5 or null

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!handle) {
        setLoading(false);
        setReviews([]);
        return;
      }
      setLoading(true);
      setError("");

      try {
        // Pass only the variables your query expects (handle).
        const data = await shopify(GET_PRODUCT_REVIEWS, { handle });
        const mf = data?.product?.metafields?.[0];
        let parsed = [];
        if (mf?.value) {
          try {
            const payload = JSON.parse(mf.value);
            parsed = (payload?.reviews || []).filter((r) => r?.status === "approved");
          } catch (e) {
            console.error("Error parsing review JSON:", e);
          }
        }
        if (!cancelled) setReviews(parsed);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load reviews");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [handle]);

  /* ----------------------- derived (sort + filter) ----------------------- */
  const filtered = React.useMemo(() => {
    if (!starFilter) return reviews;
    // exact star bucket (rounded)
    return reviews.filter((r) => Math.round(Number(r.rate || 0)) === starFilter);
  }, [reviews, starFilter]);

  const sorted = React.useMemo(() => {
    const arr = [...filtered];
    if (sort === "highest") arr.sort((a, b) => (b.rate || 0) - (a.rate || 0));
    else if (sort === "lowest") arr.sort((a, b) => (a.rate || 0) - (b.rate || 0));
    else {
      // recent
      arr.sort((a, b) => {
        const da = parseDateSafe(a.createdAt || a.date);
        const db = parseDateSafe(b.createdAt || b.date);
        if (da && db) return db - da;
        return 0;
      });
    }
    return arr;
  }, [filtered, sort]);

  const { avg, total, buckets } = React.useMemo(() => summarize(reviews), [reviews]);

  /* ---------------------------- UI states ---------------------------- */
  if (loading) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-8">
        <Card className="border-border/70">
          <CardHeader className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl sm:text-2xl">Customer Reviews</CardTitle>
                <div className="mt-1 text-sm text-muted-foreground">Loading reviews…</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full px-3 py-2 bg-[rgba(100,44,68,0.06)]">
                  <Skeleton className="h-6 w-8 rounded-md" />
                  <Skeleton className="h-4 w-12 rounded-md" />
                </div>
              </div>
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-40 mb-2" />
                    <Skeleton className="h-4 w-5/6 mb-2" />
                    <Skeleton className="h-4 w-4/6" />
                    <Separator className="mt-4" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-8">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">Customer Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Error loading reviews: {error}</p>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (!total) {
    return null;
  }

  /* -------------------------------- render -------------------------------- */
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-8 " id="customer-reviews">
      <Card className="border-border/70">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xl sm:text-2xl">Customer Reviews</CardTitle>
              {showSummary && (
                <div className="mt-2 flex items-center gap-3 text-sm text-foreground/80">
                  <div className="flex items-center gap-3">
                    <div
                      className="rounded-full px-3 py-2 flex items-center gap-3 shadow-sm"
                      style={{ backgroundColor: "rgba(100,44,68,0.06)" }}
                    >
                      <div className="text-lg font-semibold" style={{ color: BRAND }}>
                        {avg}
                      </div>
                      <RatingStars value={avg} />
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {total} {total === 1 ? "review" : "reviews"}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:items-end">
              <div className="inline-flex overflow-hidden rounded-full border border-border/70">
                {[
                  { key: "recent", label: "Most recent" },
                  { key: "highest", label: "Highest" },
                  { key: "lowest", label: "Lowest" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setSort(opt.key)}
                    className={[
                      "px-3 py-1.5 text-xs sm:text-[13px] transition",
                      sort === opt.key
                        ? "bg-[color:var(--brand-642, #642c44)] text-white"
                        : "bg-background text-foreground/80",
                    ].join(" ")}
                    aria-pressed={sort === opt.key}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {starFilter ? (
                <Button
                  variant="outline"
                  className="h-7 rounded-full px-3 text-xs"
                  onClick={() => setStarFilter(null)}
                >
                  Clear filter
                </Button>
              ) : null}
            </div>
          </div>

          {/* Histogram */}
          {showHistogram && (
            <div className="mt-2 grid gap-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = buckets[star - 1] || 0;
                const pct = total ? Math.round((count / total) * 100) : 0;
                const active = starFilter === star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setStarFilter((cur) => (cur === star ? null : star))}
                    className={[
                      "flex w-full items-center gap-3 rounded-md px-2 py-2 transition",
                      active ? "bg-[rgba(100,44,68,0.06)]" : "hover:bg-muted/60",
                    ].join(" ")}
                    aria-pressed={active}
                    aria-label={`Filter ${star}-star reviews`}
                  >
                    <div className="flex items-center gap-1 w-20 sm:w-28">
                      <span className="text-sm">{star}</span>
                      <Star size={12} className="translate-y-[0.5px] text-foreground/70" />
                      <div className="ml-2 text-xs text-muted-foreground">•</div>
                    </div>

                    <div className="relative flex-1 h-3 bg-muted rounded overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: "var(--brand-642, #642c44)",
                        }}
                      />
                    </div>

                    <div className="w-14 text-right text-xs tabular-nums text-muted-foreground">
                      {count} ({pct}%)
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardHeader>

        <CardContent>
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews match this filter.</p>
          ) : (
            <>
              <ul className="space-y-6">
                {sorted.slice(0, visible).map((r, idx) => {
                  const author = coalesceAuthor(r);
                  const text = coalesceText(r);
                  const long = (text || "").length > 260;
                  const isOpen = !!expanded[idx];
                  const display = long && !isOpen ? `${text.slice(0, 260)}…` : text;
                  const date = parseDateSafe(r.createdAt || r.date);

                  return (
                    <li key={idx} className="pb-4">
                      <article className="rounded-lg border border-border/50 bg-background/60 p-4 shadow-sm">
                        <div className="mb-3 flex items-start gap-3">
                          <Avatar name={author} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <p className="truncate text-[15px] font-medium">{author}</p>
                              <div className="flex items-center gap-2">
                                <RatingStars value={r.rate} className="shrink-0" />
                                <span className="text-xs text-muted-foreground">
                                  {typeof r.rate === "number" ? `${r.rate}/5` : ""}
                                </span>
                              </div>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {date ? `${date.toLocaleDateString()}` : ""}
                              {r.verified ? " • Verified buyer" : ""}
                            </p>
                          </div>
                        </div>

                        {display ? (
                          <p className="text-foreground/90">{display}</p>
                        ) : (
                          <p className="text-muted-foreground">No comment</p>
                        )}

                        {long && (
                          <button
                            type="button"
                            className="mt-3 text-[13px] font-medium underline underline-offset-4"
                            style={{ color: BRAND }}
                            onClick={() => setExpanded((e) => ({ ...e, [idx]: !isOpen }))}
                            aria-expanded={isOpen}
                          >
                            {isOpen ? "Show less" : "Read more"}
                          </button>
                        )}
                      </article>
                    </li>
                  );
                })}
              </ul>

              {visible < sorted.length && (
                <div className="mt-8 flex justify-center">
                  <Button
                    className="rounded-full px-6"
                    style={{ backgroundColor: BRAND }}
                    onClick={() => setVisible((v) => v + loadMoreStep)}
                  >
                    Load More Reviews
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
