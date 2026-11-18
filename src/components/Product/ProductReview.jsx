'use client';
import { useParams } from 'next/navigation';
import React from "react";
import { shopify } from "@/lib/shopify";
import { GET_PRODUCT_REVIEWS } from "@/lib/queries";
import { Skeleton } from "@/components/ui/skeleton";
import { Star } from "lucide-react";

const BRAND = "#642c44";
const BRAND_LIGHT = "rgba(100,44,68,0.1)";

function RatingStars({ value = 0, size = 14 }) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <div className="flex items-center gap-[2px]" aria-label={`${v} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const f = Math.max(0, Math.min(1, v - i));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} className="text-neutral-200" aria-hidden />
            {f > 0 && (
              <span
                className="absolute left-0 top-0 overflow-hidden"
                style={{ width: `${f * 100}%`, height: size }}
                aria-hidden
              >
                <Star size={size} fill={BRAND} stroke="none" />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

function Avatar({ name = "U" }) {
  const initials = (name || "U")
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || "")
    .join("");
  return (
    <div
      className="flex-shrink-0 grid h-9 w-9 place-items-center rounded-full text-[11px] montserrat-700"
      style={{ backgroundColor: BRAND_LIGHT, color: BRAND }}
      aria-hidden
    >
      {initials || "U"}
    </div>
  );
}

function coalesceAuthor(r = {}) {
  return r.firstName || r.author || r.name || r.user || "Valued Customer";
}
function coalesceText(r = {}) {
  return r.text || r.body || r.content || "";
}
function coalesceTitle(r = {}) {
  return r.title || r.heading || r.subject || "";
}
function parseDateSafe(v) {
  const d = v ? new Date(v) : null;
  return d && !isNaN(d) ? d : null;
}
function summarize(reviews = []) {
  if (!reviews.length) return { avg: 0, total: 0 };
  const sum = reviews.reduce((s, r) => s + Number(r.rate || 0), 0);
  return { avg: +(sum / reviews.length).toFixed(1), total: reviews.length };
}

export default function ReviewList({
  initialCount = 6,
  loadMoreStep = 6,
}) {
  const { handle } = useParams();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [reviews, setReviews] = React.useState([]);
  const [visible, setVisible] = React.useState(initialCount);
  const [expanded, setExpanded] = React.useState({});

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!handle) { setLoading(false); setReviews([]); return; }
      setLoading(true);
      setError("");
      try {
        const data = await shopify(GET_PRODUCT_REVIEWS, { handle });
        const mf = data?.product?.metafields?.[0];
        let parsed = [];
        if (mf?.value) {
          try {
            const payload = JSON.parse(mf.value);
            parsed = (payload?.reviews || []).filter((r) => r?.status === "approved");
          } catch {}
        }
        if (!cancelled) setReviews(parsed);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load reviews");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [handle]);

  const sorted = React.useMemo(() => {
    return [...reviews].sort((a, b) => {
      const da = parseDateSafe(a.createdAt || a.date);
      const db = parseDateSafe(b.createdAt || b.date);
      if (da && db) return db - da;
      return 0;
    });
  }, [reviews]);

  const { avg, total } = React.useMemo(() => summarize(reviews), [reviews]);

  if (loading) {
    return (
      <section className="bg-white py-10 sm:py-14">
        <div className="mx-auto max-w-7xl px-[5%]">
          <Skeleton className="h-6 w-44 mb-6" />
          <div className="border border-neutral-200 flex flex-col sm:flex-row">
            <div className="sm:w-52 shrink-0 p-7 border-b sm:border-b-0 sm:border-r border-neutral-200 space-y-3">
              <Skeleton className="h-12 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="flex-1">
              <div className="px-7 py-4 border-b border-neutral-200">
                <Skeleton className="h-4 w-40" />
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="px-7 py-5 border-b border-neutral-200 last:border-b-0 flex gap-3">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-5/6" />
                    <Skeleton className="h-3 w-4/6" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error || !total) return null;

  const visibleReviews = sorted.slice(0, visible);

  return (
    <section className="bg-white py-10 sm:py-14" id="customer-reviews">
      <div className="mx-auto max-w-7xl px-[5%]">

        {/* Section heading */}
        <h2 className="text-[22px] sm:text-[26px] montserrat-600 text-neutral-900 mb-6">
          Customer Reviews
        </h2>

        {/* Main bordered container */}
        <div className="border border-neutral-200 flex flex-col sm:flex-row">

          {/* Left panel: summary */}
          <div className="sm:w-52 shrink-0 flex flex-col justify-center px-7 py-8 border-b sm:border-b-0 sm:border-r border-neutral-200">
            <div
              className="text-[52px] leading-none montserrat-700 tabular-nums"
              style={{ color: BRAND }}
            >
              {avg}
            </div>
            <div className="mt-3">
              <RatingStars value={avg} size={18} />
            </div>
            <p className="mt-2.5 text-[12px] montserrat-500 text-neutral-400">
              {total} {total === 1 ? "review" : "reviews"}
            </p>
          </div>

          {/* Right panel: reviews */}
          <div className="flex-1 min-w-0">

            {/* "From people like you" bar */}
            <div className="flex items-center justify-between px-6 sm:px-8 py-4 border-b border-neutral-200">
              <span className="text-[13px] montserrat-600 text-neutral-700 tracking-wide">
                From people like you
              </span>
              {sorted.length > initialCount && (
                <span className="text-[12px] text-neutral-400 montserrat-500">
                  {visible} of {sorted.length}
                </span>
              )}
            </div>

            {/* Review rows */}
            {visibleReviews.map((r, idx) => {
              const author = coalesceAuthor(r);
              const text = coalesceText(r);
              const title = coalesceTitle(r);
              const date = parseDateSafe(r.createdAt || r.date);
              const long = text.length > 260;
              const isOpen = !!expanded[idx];
              const display = long && !isOpen ? `${text.slice(0, 260)}…` : text;

              return (
                <div
                  key={idx}
                  className={`px-6 sm:px-8 py-5 ${idx < visibleReviews.length - 1 ? "border-b border-neutral-200" : ""}`}
                >
                  <div className="flex items-start gap-3.5">
                    <Avatar name={author} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2">
                        <span className="text-[13px] montserrat-600 text-neutral-900">
                          {author}
                        </span>
                        {date && (
                          <span className="text-[12px] text-neutral-400">
                            · {date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <RatingStars value={r.rate} size={13} />
                        {title && (
                          <span className="text-[13px] montserrat-500 text-neutral-700">
                            {title}
                          </span>
                        )}
                      </div>

                      {display && (
                        <p className="mt-2 text-[13px] text-neutral-600 leading-relaxed">
                          {display}
                        </p>
                      )}

                      {long && (
                        <button
                          type="button"
                          className="mt-1.5 text-[12px] montserrat-500 underline underline-offset-2"
                          style={{ color: BRAND }}
                          onClick={() => setExpanded((e) => ({ ...e, [idx]: !isOpen }))}
                          aria-expanded={isOpen}
                        >
                          {isOpen ? "Show less" : "Read more"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Load more */}
            {visible < sorted.length && (
              <div className="px-6 sm:px-8 py-5 border-t border-neutral-200 flex justify-center">
                <button
                  type="button"
                  className="px-7 py-2.5 text-[11px] montserrat-600 uppercase tracking-[0.14em] border transition-colors"
                  style={{ borderColor: BRAND, color: BRAND }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = BRAND;
                    e.currentTarget.style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = BRAND;
                  }}
                  onClick={() => setVisible((v) => v + loadMoreStep)}
                >
                  Load more reviews
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}
