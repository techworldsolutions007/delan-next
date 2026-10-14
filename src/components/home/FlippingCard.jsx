'use client';
// src/components/home/FlippingCard.jsx
import React, { useState, useCallback, useEffect, useMemo } from "react";
import Image from "next/image";
import { shopify } from "@/lib/shopify";
import SectionHeader from "@/components/ui/SectionHeader";

/* ---------------- Shopify query (by title) ---------------- */
const GET_PRODUCT_IMAGES_BY_TITLE = /* GraphQL */ `
  query GetProductImagesByTitle($query: String!) {
    products(first: 1, query: $query) {
      edges {
        node {
          id
          title
          images(first: 10) {
            edges {
              node { url altText }
            }
          }
          media(first: 10) {
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

/** Fetch ordered image URLs from a product by exact title */
async function fetchFlippingCardImagesByTitle(title = "FlippingCard") {
  const query = `title:'${String(title).replace(/'/g, "\\'")}'`;
  const data = await shopify(GET_PRODUCT_IMAGES_BY_TITLE, { query });

  const product = data?.products?.edges?.[0]?.node;
  if (!product) return [];

  const urls = [];

  // legacy "images" field
  for (const e of product.images?.edges || []) {
    if (e?.node?.url) urls.push({ url: e.node.url, alt: e.node.altText || "" });
  }

  // media images (newer API path)
  for (const e of product.media?.edges || []) {
    const img = e?.node?.image;
    if (img?.url) urls.push({ url: img.url, alt: img.altText || "" });
  }

  // de-dupe by URL, preserve order
  const seen = new Set();
  const deduped = [];
  for (const it of urls) {
    if (seen.has(it.url)) continue;
    seen.add(it.url);
    deduped.push(it);
  }
  return deduped;
}

export default function FlippingCard({
  productTitle = "FlippingCard", // override if you rename it
}) {
  const [flipped, setFlipped] = useState(false);
  const [imgs, setImgs] = useState([]);
  const [err, setErr] = useState("");

  // load images once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setErr("");
        const all = await fetchFlippingCardImagesByTitle(productTitle);
        if (cancelled) return;
        setImgs(all);
      } catch (e) {
        if (!cancelled) {
          console.error("[FlippingCard] failed to load images:", e);
          setErr("Couldn't load flipping card assets.");
          setImgs([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productTitle]);

  // map to roles (with fallbacks)
  const { frontDesktop, frontMobile, backTL, backTR, backBL, backBR } = useMemo(() => {
    const fDesk = imgs[0] || null;
    const fMob = imgs[1] || fDesk || null;
    const tl = imgs[2] || null;
    const tr = imgs[3] || null;
    const bl = imgs[4] || null;
    const br = imgs[5] || null;
    return {
      frontDesktop: fDesk,
      frontMobile: fMob,
      backTL: tl,
      backTR: tr,
      backBL: bl,
      backBR: br,
    };
  }, [imgs]);

  const toggle = useCallback(() => setFlipped((f) => !f), []);
  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <section className="px-[5%] pt-10 pb-6 md:pb-10">
      {/* ✅ Heading added */}
      <SectionHeader
        title="Story Behind Brand"
        subtitle="Crafting timeless elegance and confidence for over 25 years"
        className="mb-6 md:mb-8"
      />

      <div
        className="mx-auto max-w-8xl"
        role="button"
        tabIndex={0}
        aria-pressed={flipped ? "true" : "false"}
        aria-label={flipped ? "Flip back" : "Tap to flip"}
        onClick={toggle}
        onKeyDown={onKeyDown}
      >
        {/* optional minimal error note */}
        {err ? (
          <div className="mb-3 rounded bg-yellow-50 text-yellow-900 text-xs px-3 py-2">
            {err}
          </div>
        ) : null}

        <div className="relative w-full [perspective:1200px]">
          <div
            className={`relative h-[550px] md:h-[600px] w-full rounded-2xl shadow-xl transition-transform duration-900 ease-out [transform-style:preserve-3d] ${flipped ? "[transform:rotateY(180deg)]" : ""
              }`}
          >
            {/* FRONT: Banner image */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl [backface-visibility:hidden]">
              {(frontMobile?.url || frontDesktop?.url) ? (
                <Image
                  src={frontMobile?.url || frontDesktop?.url}
                  alt={frontMobile?.alt || frontDesktop?.alt || "Delan fashion banner"}
                  fill
                  className="object-cover"
                  draggable="false"
                />
              ) : (
                <div className="h-full w-full grid place-items-center bg-muted text-muted-foreground">
                  No banner image
                </div>
              )}

              {/* Subtle "Tap to flip" overlay */}
              <div
                className="pointer-events-none absolute inset-0 flex items-end justify-center pb-4 md:pb-6"
                style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
              >
                <span className="montserrat-600 select-none px-5 py-2 text-primary text-xs md:text-lg font-semibold">
                  Tap to flip
                </span>
              </div>
            </div>

            {/* BACK: Text + corner images */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl bg-accent [backface-visibility:hidden] [transform:rotateY(180deg)]">
              {/* Corner Polaroids (decorative) with fade-in on flip */}
              <div className="pointer-events-none absolute inset-0 z-10">
                {/* Top-left */}
                {backTL?.url ? (
                  <Image
                    src={backTL.url}
                    alt={backTL.alt || ""}
                    width={100}
                    height={120}
                    aria-hidden="true"
                    className={`absolute top-5 md:top-10 left-5 md:left-10 w-17 md:w-20 lg:w-25 rotate-[-15deg] shadow-xl rounded-md will-change-transform transition duration-700 ease-out ${flipped ? "opacity-100 scale-100" : "opacity-0 scale-[.98]"
                      } delay-150`}
                    draggable="false"
                  />
                ) : null}

                {/* Top-right */}
                {backTR?.url ? (
                  <Image
                    src={backTR.url}
                    alt={backTR.alt || ""}
                    width={100}
                    height={120}
                    aria-hidden="true"
                    className={`absolute top-5 right-5 md:top-10 md:right-10 w-17 md:w-20 lg:w-25 rotate-[15deg] shadow-xl rounded-md will-change-transform transition duration-700 ease-out ${flipped ? "opacity-100 scale-100" : "opacity-0 scale-[.98]"
                      } delay-300`}
                    draggable="false"
                  />
                ) : null}

                {/* Bottom-left */}
                {backBL?.url ? (
                  <Image
                    src={backBL.url}
                    alt={backBL.alt || ""}
                    width={100}
                    height={120}
                    aria-hidden="true"
                    className={`absolute bottom-5 left-5 md:bottom-10 md:left-10 w-17 md:w-20 lg:w-25 rotate-[20deg] shadow-xl rounded-md will-change-transform transition duration-700 ease-out ${flipped ? "opacity-100 scale-100" : "opacity-0 scale-[.98]"
                      } delay-500`}
                    draggable="false"
                  />
                ) : null}

                {/* Bottom-right */}
                {backBR?.url ? (
                  <Image
                    src={backBR.url}
                    alt={backBR.alt || ""}
                    width={100}
                    height={120}
                    aria-hidden="true"
                    className={`absolute bottom-5 right-5 md:bottom-10 md:right-10 w-17 md:w-20 lg:w-25 rotate-[-20deg] shadow-xl rounded-md will-change-transform transition duration-700 ease-out ${flipped ? "opacity-100 scale-100" : "opacity-0 scale-[.98]"
                      } delay-700`}
                    draggable="false"
                  />
                ) : null}
              </div>

              {/* Centered copy */}
              <div className="relative z-20 flex h-full items-center justify-center p-6 md:p-10">
                <div className="relative max-w-2xl md:max-w-4xl text-center text-primary [text-wrap:balance] px-6 py-6 md:px-12 md:py-12">
                  {/* Decorative quotes (very subtle) */}
                  <div className="pointer-events-none absolute left-5 top-5 text-3xl md:text-6xl lg:text-7xl text-primary/10 select-none leading-none">
                    {'"'}
                  </div>
                  <div className="pointer-events-none absolute right-5 bottom-1 text-3xl md:text-6xl lg:text-7xl text-primary/10 select-none leading-none">
                    {'"'}
                  </div>

                  <p className="montserrat-500 text-xs md:text-lg lg:text-xl leading-relaxed md:leading-8">
                    Finding clothes that show who you really are, while lasting beyond quick fashion trends feels impossible.
                  </p>

                  {/* Minimal divider */}
                  <div className="mx-auto my-4 h-px w-20 bg-primary/20" />

                  <p className="montserrat-500 text-xs md:text-lg lg:text-xl leading-relaxed md:leading-8">
                    For 25 years, <span className="font-semibold">Delan</span> has helped modern women solve this problem with
                    perfectly fitted pieces made from beautiful, long-lasting fabrics that never go out of style.
                  </p>

                  {/* Confidence line with a clean accent underline (no size change) */}
                  <p className="mt-3 montserrat-600 text-sm md:text-xl lg:text-2xl font-semibold leading-relaxed md:leading-8">
                    <span className="relative inline-block">
                      We don’t just make clothes, we create confidence.
                      <span className="block mx-auto mt-2 h-[2px] w-12 bg-primary/30" />
                    </span>
                  </p>

                  <p className="mt-3 montserrat-500 text-xs md:text-lg lg:text-xl leading-relaxed md:leading-8">
                    When you wear Delan, you’re not copying others. You’re showing the world who you are. Own it{" "}
                    <span className="font-semibold underline decoration-primary/30 underline-offset-4">
                      #TrustYourStyle
                    </span>
                  </p>

                  {/* Flip instruction */}
                  <div
                    className="pointer-events-none mt-6 text-xs md:text-sm text-primary/60 flex items-end justify-center"
                    style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
                  >
                    <span className="hidden sm:inline">Click anywhere to flip back</span>
                    <span className="sm:hidden">Tap anywhere to flip back</span>
                  </div>
                </div>
              </div>
            </div>
            {/* /BACK */}
          </div>
        </div>
      </div>
    </section>
  );
}
