'use client';
import Link from 'next/link';
// src/components/Categories.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { shopify } from "@/lib/shopify";

/* ---------------- Shopify query (by product title) ---------------- */
const GET_PRODUCT_IMAGES_BY_TITLE = /* GraphQL */ `
  query GetProductImagesByTitle($query: String!) {
    products(first: 1, query: $query) {
      edges {
        node {
          id
          title
          images(first: 20) {
            edges { node { url altText } }
          }
          media(first: 20) {
            edges {
              node {
                __typename
                ... on MediaImage { image { url altText } }
              }
            }
          }
        }
      }
    }
  }
`;

const edgeNodes = (edges = []) => edges.map((e) => e?.node).filter(Boolean);

async function fetchCategoryImagesByTitle(title = "Categories") {
  const query = `title:'${String(title).replace(/'/g, "\\'")}'`;
  const data = await shopify(GET_PRODUCT_IMAGES_BY_TITLE, { query });

  const product = data?.products?.edges?.[0]?.node;
  if (!product) return [];

  const images = [];

  // legacy images
  for (const e of product.images?.edges || []) {
    if (e?.node?.url) images.push({ url: e.node.url, alt: e.node.altText || "" });
  }

  // media images (newer)
  for (const e of product.media?.edges || []) {
    const img = e?.node?.image;
    if (img?.url) images.push({ url: img.url, alt: img.altText || "" });
  }

  // de-dupe by URL, preserve order
  const seen = new Set();
  const deduped = [];
  for (const it of images) {
    if (seen.has(it.url)) continue;
    seen.add(it.url);
    deduped.push(it);
  }
  return deduped;
}

/* ---------- Reusable animated image card ---------- */
const CategoryImage = ({ category, motionKey, ...props }) => (
  <Card className="border-0 shadow-none">
    <CardContent className="p-0">
      <AspectRatio ratio={4 / 5} className="overflow-hidden rounded-2xl">
        <AnimatePresence mode="wait">
          {category?.img ? (
            <motion.img
              key={motionKey}
              src={category.img}
              alt={category.name}
              className="h-full w-full select-none object-contain"
              draggable="false"
              loading="lazy"
              decoding="async"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              {...props}
            />
          ) : (
            <motion.div
              key={motionKey + "-placeholder"}
              className="h-full w-full bg-neutral-100"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.4 }}
              aria-hidden="true"
            />
          )}
        </AnimatePresence>
      </AspectRatio>
    </CardContent>
  </Card>
);

export default function Categories({
  productTitle = "Categories", // change if you rename the product in Shopify
}) {
  const [imgs, setImgs] = useState([]);
  const [err, setErr] = useState("");

  // fetch once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setErr("");
        const list = await fetchCategoryImagesByTitle(productTitle);
        if (!cancelled) setImgs(list);
      } catch (e) {
        if (!cancelled) {
          console.error("[Categories] failed to load:", e);
          setErr("Couldn't load category images.");
          setImgs([]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [productTitle]);

  // Map images in sequence to your four tiles
  const categories = useMemo(
    () => [
      { name: "THE 9-TO-5 WARDROBE", img: imgs[0]?.url || "", handle: "the-9-to-5-wardrobe" },
      { name: "FOR A TABLE FOR TWO", img: imgs[1]?.url || "", handle: "for-a-table-for-two" },
      { name: "THE MAIN EVENT",      img: imgs[2]?.url || "", handle: "the-main-event" },
      { name: "THE FESTIVE CHAPTER", img: imgs[3]?.url || "", handle: "the-festive-chapter" },
    ],
    [imgs]
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const safeIndex = categories.length ? activeIndex % categories.length : 0;
  const nextIndex = categories.length ? (safeIndex + 1) % categories.length : 0;
  const nextNextIndex = categories.length ? (safeIndex + 2) % categories.length : 0;

  return (
    <section id="categories-section" className="bg-white px-[5%] pt-10 pb-5">
      {/* Optional error note */}
      {err ? (
        <div className="mx-auto mb-3 max-w-[1200px] rounded bg-yellow-50 text-yellow-900 text-xs px-3 py-2">
          {err}
        </div>
      ) : null}

      <h2 className="text-center cormorant-garamond-700 uppercase text-primary text-3xl md:text-4xl lg:text-4xl mb-6">
        Our Curated Collection
      </h2>

      <div className="mx-auto grid max-w-[1200px] items-start gap-10 lg:grid-cols-[minmax(320px,1fr)_minmax(420px,560px)_minmax(220px,1fr)]">
        {/* LEFT: Desktop Navigation */}
        <div className="hidden lg:block self-center">
          <nav aria-label="Curated categories" className="flex flex-col gap-6">
            {categories.map((cat, idx) => {
              const isActive = idx === safeIndex;
              return (
                <Link
                  key={cat.name}
                  to={`/collections/${cat.handle}`}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onFocus={() => setActiveIndex(idx)}
                  className="group block"
                >
                  <span
                    className={[
                      "uppercase",
                      "text-lg md:text-2xl leading-tight",
                      "tracking-[0.06em] montserrat-500 uppercase",
                      isActive
                        ? "text-primary"
                        : "text-neutral-300 hover:text-neutral-400 transition-colors",
                    ].join(" ")}
                  >
                    {cat.name}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* CENTER: Desktop Image Preview */}
        <div className="relative hidden lg:block">
          <CategoryImage
            category={categories[safeIndex]}
            motionKey={categories[safeIndex]?.name || "current"}
          />
          {/* Blurred previews */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute right-[-12%] top-[22%] h-[38%] w-[26%] overflow-hidden rounded-xl opacity-70 blur-[2px]">
              <AnimatePresence mode="wait">
                <motion.img
                  key={(categories[nextIndex]?.name || "next") + "-next"}
                  src={categories[nextIndex]?.img || ""}
                  alt=""
                  className="h-full w-full object-contain"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.45 }}
                />
              </AnimatePresence>
            </div>
            <div className="absolute right-[-20%] bottom-[6%] h-[40%] w-[28%] overflow-hidden rounded-xl opacity-60 blur-[4px]">
              <AnimatePresence mode="wait">
                <motion.img
                  key={(categories[nextNextIndex]?.name || "next2") + "-next-next"}
                  src={categories[nextNextIndex]?.img || ""}
                  alt=""
                  className="h-full w-full object-contain"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.45, delay: 0.08 }}
                />
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* RIGHT: Desktop Spacer */}
        <div className="hidden lg:block" aria-hidden="true" />

        {/* MOBILE/TABLET LAYOUT */}
        <div className="lg:hidden col-span-full space-y-8">
          <nav aria-label="Curated categories (mobile)" className="flex flex-col items-center gap-6">
            {categories.map((cat, idx) => {
              const isActive = idx === safeIndex;
              return (
                <Link
                  key={cat.name}
                  to={`/collections/${cat.handle}`}
                  onClick={() => setActiveIndex(idx)}
                  className="group"
                >
                  <span
                    className={[
                      "font-primary uppercase text-center",
                      "text-[clamp(1.25rem,7vw,2rem)] leading-tight",
                      "tracking-[0.06em]",
                      isActive
                        ? "text-[color:var(--brand-642, #642c44)]"
                        : "text-neutral-300 hover:text-neutral-400 transition-colors",
                    ].join(" ")}
                  >
                    {cat.name}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Mobile Image Preview */}
          <CategoryImage
            category={categories[safeIndex]}
            motionKey={(categories[safeIndex]?.name || "current") + "-m"}
          />
        </div>
      </div>
    </section>
  );
}
