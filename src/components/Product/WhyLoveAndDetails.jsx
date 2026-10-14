'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
// src/components/product/WhyLoveAndDetails.jsx
import React from "react";
import { shopify } from "@/lib/shopify";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, CheckCircle2 } from "lucide-react";
import {
  escapeHtml,
  normalizeShopifyDescriptionHtml,
} from "@/utils/shopifyDescription";

const BRAND = "var(--brand-642, #642c44)";

/* =========================================================
   STORE-WIDE DEFAULTS (edit these)
   ========================================================= */
const STATIC_HIGHLIGHTS = ["Breathable"];

/**
 * ✅ Requested change:
 * Instead of "Linen–Cotton Blouse", we redirect user to /fabric-care
 */
const FABRIC_CARE_PATH = "/fabric-care";

/**
 * Keep wash/care bullets here (product page quick view),
 * and for full fabric info we redirect to /fabric-care
 */
const STATIC_WASH_CARE = ["Hand wash cold"];

/* ================= Minimal product query ================= */
const GET_PRODUCT_DESC = /* GraphQL */ `
  query ProductForDetails($handle: String!) {
    product(handle: $handle) {
      id
      title
      description
      descriptionHtml
      featuredImage {
        url
        altText
      }
      images(first: 1) {
        nodes {
          url
          altText
        }
      }
      variants(first: 1) {
        nodes {
          sku
        }
      }
    }
  }
`;

/* ================= helpers ================= */
const pickDescription = (p) =>
  (p?.descriptionHtml && String(p.descriptionHtml).trim()) ||
  (p?.description && `<p>${escapeHtml(p.description)}</p>`) ||
  "";

function resolveHandle(override, params = {}) {
  if (override) return override;
  return (
    params.handle ??
    params.productHandle ??
    params.product ??
    params.slug ??
    params.id ??
    ""
  );
}

// gid://shopify/Product/123 → 123
function parseShopifyNumericId(id) {
  if (!id) return null;
  const maybe = String(id).split("/").pop();
  const num = Number(maybe);
  return Number.isFinite(num) ? num : null;
}

/* ================= component ================= */
export default function WhyLoveAndDetails({
  handle: handleOverride,
  enableReview = true,
  showDescription = true,
  embedded = false,
  onSubmitReview,
  productId,
  productTitle,
  productImage,
  productSku,
}) {
  const params = useParams();
  const handle = resolveHandle(handleOverride, params);

  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");
  const [loveHtml, setLoveHtml] = React.useState("");

  // Shopify bits (used for review payload)
  const [numericProductId, setNumericProductId] = React.useState(null);
  const [titleFromShopify, setTitleFromShopify] = React.useState("");
  const [imageFromShopify, setImageFromShopify] = React.useState("");
  const [skuFromShopify, setSkuFromShopify] = React.useState("");

  // description collapse/expand
  const [expanded, setExpanded] = React.useState(false);
  const [overflowNeeded, setOverflowNeeded] = React.useState(false);
  const descRef = React.useRef(null);
  const COLLAPSED_PX = 340;
  const fallbackNumericProductId = parseShopifyNumericId(productId);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!handle) {
        setLoading(false);
        setErr("Missing product handle.");
        return;
      }

      if (!showDescription && fallbackNumericProductId) {
        if (!cancelled) {
          setLoading(false);
          setErr("");
          setNumericProductId(fallbackNumericProductId);
          setTitleFromShopify(productTitle || "");
          setImageFromShopify(productImage || "");
          setSkuFromShopify(productSku || "");
        }
        return;
      }

      setLoading(true);
      setErr("");
      try {
        const data = await shopify(GET_PRODUCT_DESC, { handle });
        const p = data?.product;
        if (!p) throw new Error("Product not found.");

        const html = normalizeShopifyDescriptionHtml(p?.descriptionHtml || pickDescription(p));

        if (!cancelled) {
          setLoveHtml(html || "<p>No description available.</p>");
          setNumericProductId(parseShopifyNumericId(p?.id));
          setTitleFromShopify(p?.title || "");
          setImageFromShopify(
            p?.featuredImage?.url || p?.images?.nodes?.[0]?.url || ""
          );
          setSkuFromShopify(p?.variants?.nodes?.[0]?.sku || "");
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e?.message || "Failed to load product details");
          setLoveHtml("<p>No description available.</p>");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    fallbackNumericProductId,
    handle,
    productImage,
    productSku,
    productTitle,
    showDescription,
  ]);

  // detect if description needs truncation
  React.useEffect(() => {
    const el = descRef.current;
    if (!el) return;

    const check = () => setOverflowNeeded(el.scrollHeight > COLLAPSED_PX + 8);
    check();

    const ro = new ResizeObserver(check);
    ro.observe(el);

    const imgs = el.querySelectorAll("img");
    imgs.forEach((img) => img.addEventListener("load", check));

    return () => {
      ro.disconnect();
      imgs.forEach((img) => img.removeEventListener("load", check));
    };
  }, [loveHtml]);

  /* ================= Review form (unchanged) ================= */
  const [rating, setRating] = React.useState(0);
  const [name, setName] = React.useState("");
  const [text, setText] = React.useState("");
  const [submitLoading, setSubmitLoading] = React.useState(false);
  const [submitError, setSubmitError] = React.useState("");
  const [submitSuccess, setSubmitSuccess] = React.useState("");

  const validate = () => {
    const finalProductId = parseShopifyNumericId(productId) ?? numericProductId;
    if (!finalProductId) return "Missing product id for this item.";
    if (!rating || rating < 1 || rating > 5)
      return "Please choose a star rating.";
    if (!text || !text.trim()) return "Please add some review text.";
    if (!handle) return "Missing product handle.";
    return "";
  };

  const defaultPostReview = async ({ handle, rating, text, name }) => {
    const cleanRating = Math.max(1, Math.min(5, Number(rating || 0)));
    const cleanText = String(text || "").trim();
    const cleanName = String(name || "").trim() || "Anonymous";
    const finalProductId = parseShopifyNumericId(productId) ?? numericProductId;

    const payload = {
      shopId: "4GGLsnRA4vQdKunZWVFe",
      productId: finalProductId,
      productHandle: handle,
      productTitle: productTitle || titleFromShopify || "",
      productImage: productImage || imageFromShopify || "",
      productSku: productSku || skuFromShopify || "",
      rating: cleanRating,
      rate: cleanRating,
      content: cleanText,
      author: cleanName,
      platform: "shopify",
      source: "widget",
      status: "disapproved",
    };

    const res = await fetch("https://app.airreviews.io/review/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      mode: "cors",
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || data?.success === false) {
      const msg = data?.message || res.statusText;
      throw new Error(msg || "Failed to submit review.");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess("");

    const v = validate();
    if (v) {
      setSubmitError(v);
      return;
    }

    setSubmitLoading(true);
    try {
      if (onSubmitReview) {
        await Promise.resolve(onSubmitReview({ handle, rating, text, name }));
      } else {
        await defaultPostReview({ handle, rating, text, name });
      }
      setSubmitSuccess("Thanks! Your review has been submitted.");
      setRating(0);
      setText("");
      setName("");
    } catch (e) {
      setSubmitError(
        e?.message || "Something went wrong while submitting your review."
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  const sectionClassName = showDescription
    ? "mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-2 md:gap-8 montserrat-500"
    : embedded
      ? "w-full py-0 montserrat-500"
      : "mx-auto max-w-7xl px-4 py-6 montserrat-500";

  const accordionWrapperClassName = showDescription
    ? ""
    : embedded
      ? "w-full"
      : "mx-auto w-full max-w-3xl";

  return (
    <section
      className={sectionClassName}
    >
      {/* LEFT: Why you’ll love this (Shopify description) */}
      {showDescription ? (
        <Card className="border-border/70">
        <CardHeader className="pt-0 pb-2"></CardHeader>

        <CardContent className="pt-2 pb-0">
          {loading ? (
            <div className="space-y-3">
              <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
              <div className="h-4 w-10/12 animate-pulse rounded bg-muted" />
              <div className="h-4 w-9/12 animate-pulse rounded bg-muted" />
              <div className="h-4 w-8/12 animate-pulse rounded bg-muted" />
            </div>
          ) : err && !loveHtml ? (
            <p className="text-sm text-muted-foreground">{err}</p>
          ) : (
            <>
              {/* Description wrapper with collapse/expand */}
              <div className="relative">
                <div
                  ref={descRef}
                  className={[
                    "shopify-product-description text-foreground transition-[max-height] duration-500 ease-in-out",
                    "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-primary [&_h1]:mt-8 [&_h1]:mb-4",
                    "[&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-primary [&_h2]:mt-6 [&_h2]:mb-3",
                    "[&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-primary [&_h3]:mt-4 [&_h3]:mb-2",
                    "[&_h4]:text-base [&_h4]:font-bold [&_h4]:text-primary [&_h4]:mt-3 [&_h4]:mb-1",
                    expanded
                      ? "max-h-[9999px]"
                      : "max-h-[340px] overflow-hidden",
                  ].join(" ")}
                  dangerouslySetInnerHTML={{ __html: loveHtml }}
                />
                {!expanded && overflowNeeded && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />
                )}
              </div>

              {overflowNeeded && (
                <div className="mt-4">
                  <Button
                    type="button"
                    className="w-full bg-primary hover:bg-primary/90"
                    aria-expanded={expanded}
                    onClick={() => setExpanded((v) => !v)}
                  >
                    {expanded ? "Show less" : "Read more"}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
        </Card>
      ) : null}

      {/* RIGHT: Static accordion + Review form */}
      <div className={accordionWrapperClassName}>
        <div className="rounded-lg border border-border/70 montserrat-600">
          <Accordion type="single" collapsible className="w-full">
            {enableReview && (
              <AccordionItem value="review">
                <AccordionTrigger className="px-4 py-3 text-left text-[14px] sm:text-base tracking-[0.15em] uppercase">
                  Write a Review
                </AccordionTrigger>
                <AccordionContent className="text-left">
                  <Separator className="mb-3" />
                  <div className="px-4 pb-4">
                    <div className="mb-3 flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((i) => {
                        const active = i <= rating;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setRating(i)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setRating(i);
                              }
                            }}
                            aria-label={`${i} star${i > 1 ? "s" : ""}`}
                            aria-pressed={active}
                            className="rounded transition hover:scale-[1.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                          >
                            <Star
                              size={22}
                              className={
                                active ? "text-primary" : "text-muted-foreground/50"
                              }
                              {...(active ? { fill: "currentColor" } : {})}
                            />
                          </button>
                        );
                      })}
                    </div>

                    <form onSubmit={submit} className="space-y-3" noValidate>
                      <div className="sm:col-span-2">
                        <label
                          htmlFor="reviewer-name"
                          className="text-primary montserrat-600 text-sm"
                        >
                          Your Name
                        </label>
                        <Input
                          id="reviewer-name"
                          value={name}
                          className="bg-white!"
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your name"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="review-text"
                          className="text-primary montserrat-600 text-sm"
                        >
                          Your Message
                        </label>
                        <Textarea
                          id="review-text"
                          name="review"
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                          placeholder="Share your thoughts..."
                          className="min-h-[100px] bg-white!"
                          aria-invalid={!!submitError && (!text || !text.trim())}
                        />
                      </div>

                      {submitError ? (
                        <p className="text-sm text-red-600" role="alert">
                          {submitError}
                        </p>
                      ) : submitSuccess ? (
                        <p className="text-sm text-green-600" role="status">
                          {submitSuccess}
                        </p>
                      ) : null}

                      <Button
                        type="submit"
                        disabled={submitLoading}
                        className="w-full px-6 bg-primary hover:bg-primary/90"
                      >
                        {submitLoading ? "Submitting..." : "Submit"}
                      </Button>
                    </form>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </div>

      </div>
    </section>
  );
}
