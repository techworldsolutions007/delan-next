'use client';
import Link from 'next/link';
import Image from 'next/image';
// src/components/UspShowcase.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { shopify } from "@/lib/shopify";

/* ---------------- Shopify query (by product title) ---------------- */
const GET_PRODUCT_IMAGES_BY_TITLE = /* GraphQL */ `
  query GetProductImagesByTitle($query: String!) {
    products(first: 1, query: $query) {
      edges {
        node {
          id
          title
          images(first: 20) { edges { node { url altText } } }
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

// utility
const edgeNodes = (edges = []) => edges.map((e) => e?.node).filter(Boolean);

/** Fetch ordered image URLs from a product by exact title */
async function fetchImagesByProductTitle(title = "UspShowcase") {
  const query = `title:'${String(title).replace(/'/g, "\\'")}'`;
  const data = await shopify(GET_PRODUCT_IMAGES_BY_TITLE, { query });
  const product = data?.products?.edges?.[0]?.node;
  if (!product) return [];

  const urls = [];

  // legacy images array
  for (const e of product.images?.edges || []) {
    if (e?.node?.url) urls.push({ url: e.node.url, alt: e.node.altText || "" });
  }

  // newer media images
  for (const e of product.media?.edges || []) {
    const img = e?.node?.image;
    if (img?.url) urls.push({ url: img.url, alt: img.altText || "" });
  }

  // de-dupe preserving order
  const seen = new Set();
  const deduped = [];
  for (const it of urls) {
    if (seen.has(it.url)) continue;
    seen.add(it.url);
    deduped.push(it);
  }
  return deduped;
}

export default function UspShowcase({ productTitle = "UspShowcase" }) {
  const sectionRef = useRef/** @type {React.MutableRefObject<HTMLElement|null>} */(null);
  const scrollRef = useRef/** @type {React.MutableRefObject<HTMLDivElement|null>} */(null);
  const headRef = useRef/** @type {React.MutableRefObject<HTMLElement|null>} */(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isCompact, setIsCompact] = useState(false); // mobile + tablet (<=1024px)
  const [headH, setHeadH] = useState(0);
  const [fixed, setFixed] = useState(false);
  const [imgs, setImgs] = useState([]);
  const [err, setErr] = useState("");
  const NAV_OFFSET = 0;

  // Base content (titles/descriptions). Images will be injected after fetch.
  const baseUsps = useMemo(() => ([
    {
      title: "Crafted from 100% natural fabrics",
      description:
        "Experience the pure comfort and breathability of materials sourced directly from nature, ensuring a soft touch on your skin and a clear conscience.",
    },
    {
      title: "Uncompromised quality at fair prices",
      description:
        "We believe luxury should be accessible. Our direct-to-consumer model eliminates middlemen, allowing us to offer premium garments without the premium price tag.",
    },
    {
      title: "Sustainable fashion for conscious living",
      description:
        "From ethical sourcing to eco-friendly packaging, every step of our process is designed to minimize our environmental footprint and promote a healthier planet.",
    },
    {
      title: "Elegant designs, timeless everyday wear",
      description:
        "Our collections are thoughtfully designed to be both beautiful and versatile, creating staple pieces that you will cherish and wear for years to come.",
    },
    {
      title: "Comfort, style, and responsibility combined",
      description:
        "You no longer have to choose. Our brand is a promise of clothing that looks good, feels good, and does good for the world.",
    },
  ]), []);

  // Inject images in order: 0..4 map to the 5 USPs
  const usps = useMemo(() => {
    return baseUsps.map((u, i) => ({
      ...u,
      image: imgs[i]?.url || "",
      alt: imgs[i]?.alt || u.title,
    }));
  }, [baseUsps, imgs]);

  /* ---------------- Fetch images ---------------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setErr("");
        const list = await fetchImagesByProductTitle(productTitle);
        if (!cancelled) setImgs(list);
      } catch (e) {
        if (!cancelled) {
          console.error("[UspShowcase] image fetch failed:", e);
          setErr("Couldn't load USP images.");
          setImgs([]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [productTitle]);

  // Compact (mobile + tablet) breakpoint watcher (<=1024px)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1024px)");
    const apply = () => setIsCompact(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Measure header height
  useEffect(() => {
    const el = headRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeadH(el.offsetHeight || 0));
    ro.observe(el);
    setHeadH(el.offsetHeight || 0);
    return () => ro.disconnect();
  }, []);

  // Combined scroll handler
  useEffect(() => {
    const handleScroll = () => {
      const sectionNode = sectionRef.current;
      const scrollContentNode = scrollRef.current;
      if (!sectionNode || !scrollContentNode) return;

      const height = scrollContentNode.offsetHeight;
      const scrollOffset = window.innerHeight * 0.5;
      const scrollPosition = window.scrollY + scrollOffset;
      const componentTop = scrollContentNode.offsetTop;
      const progress = scrollPosition - componentTop;
      const sectionHeight = height / baseUsps.length;
      const newIdx = Math.min(baseUsps.length - 1, Math.max(0, Math.floor(progress / sectionHeight)));
      setActiveIndex(newIdx);

      const rect = sectionNode.getBoundingClientRect();
      const isLastItem = newIdx === baseUsps.length - 1;
      const shouldFix = rect.top <= NAV_OFFSET && rect.bottom - headH > NAV_OFFSET && !isLastItem && !isCompact;
      setFixed(shouldFix);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [baseUsps.length, headH, isCompact, NAV_OFFSET]);

  const imageStyleFor = (index) => {
    const total = baseUsps.length;
    const relativeIndex = (index - activeIndex + total) % total;

    if (isCompact) {
      return relativeIndex === 0
        ? { opacity: 1, transform: "scale(1)", zIndex: 10 }
        : { opacity: 0, transform: "scale(0.9)", zIndex: 0 };
    }
    if (relativeIndex === 0) {
      return {
        opacity: 1,
        transform: "translate(0,0) scale(1)",
        zIndex: 30,
        filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.25))",
      };
    } else if (relativeIndex === 1) {
      return {
        opacity: 0.75,
        transform: "translate(-110px, 150px) scale(0.82)",
        zIndex: 20,
        filter: "blur(2px)",
      };
    } else if (relativeIndex === total - 1) {
      return {
        opacity: 0.55,
        transform: "translate(-110px, -150px) scale(0.82)",
        zIndex: 10,
        filter: "blur(3px)",
      };
    }
    return { opacity: 0, transform: "scale(0.7)", zIndex: 0 };
  };

  return (
    <section ref={sectionRef} className="bg-white font-[var(--font-primary)]">
      {/* Optional tiny error message */}
      {err ? (
        <div className="px-4 lg:px-[5%] pt-4">
          <div className="rounded bg-yellow-50 text-yellow-900 text-xs px-3 py-2">{err}</div>
        </div>
      ) : null}

      {/* Flow header (occupies layout). Hidden when fixed header shows. */}
      <header
        ref={headRef}
        className="px-4 lg:px-[5%] pt-10 pb-5 text-center"
        aria-label="USP Section Heading"
        style={{ visibility: fixed ? "hidden" : "visible" }}
      >
        <h2 className="text-center cormorant-garamond-700 uppercase text-primary text-3xl md:text-4xl">
          Crafted with Purpose
        </h2>
      </header>

      {/* Sticky header (only used on large screens) */}
      {!isCompact && fixed && (
        <header
          className="fixed w-full bg-white z-20 px-4 lg:px-[5%] pt-10 pb-5 text-center"
          style={{ top: NAV_OFFSET }}
        >
          <h2 className="text-center cormorant-garamond-700 uppercase text-primary text-3xl md:text-4xl">
            Crafted with Purpose
          </h2>
        </header>
      )}

      {/* Scrolly content */}
      <div
        ref={scrollRef}
        className={
          "flex flex-col lg:flex-row " +
          "min-h-[100vh] lg:min-h-[320vh]"
        }
      >

        {/* Images panel */}
        <div
          className={
            "w-full lg:w-1/2 " +
            "lg:sticky flex items-center justify-center overflow-hidden px-4 lg:px-0 z-10"
          }
          style={{
            top: !isCompact ? headH + NAV_OFFSET : undefined,
            height: isCompact ? "54vh" : `calc(100vh - ${headH + NAV_OFFSET}px)`,
          }}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            {usps.map((usp, i) =>
              usp.image ? (
                <Image
                  key={i}
                  src={usp.image}
                  alt={usp.alt || usp.title}
                  fill
                  className="object-contain transition-all duration-700 ease-in-out"
                  style={imageStyleFor(i)}
                  draggable="false"
                />
              ) : (
                <div
                  key={i}
                  aria-hidden="true"
                  className={
                    "absolute bg-neutral-100 rounded-lg " +
                    "transition-all duration-700 ease-in-out " +
                    "w-[70%] h-[60%]"
                  }
                  style={imageStyleFor(i)}
                />
              )
            )}
          </div>
        </div>

        {/* Text panel */}
        <div
          className={
            "w-full lg:w-1/2 " +
            "lg:sticky flex flex-col md:justify-start px-4 lg:px-0 pt-8 lg:pt-[12vh] pb-12 lg:pb-10 z-10"
          }
          style={{
            top: !isCompact ? headH + NAV_OFFSET : undefined,
            height: isCompact ? "auto" : `calc(100vh - ${headH + NAV_OFFSET}px)`,
          }}
        >
          {/* Desktop layered slides (only large) */}
          <div className="relative hidden lg:block max-w-[540px] pr-20 flex-1 leading-relaxed">
            {usps.map((usp, i) => (
              <div
                key={i}
                className={[
                  "absolute w-[520px] transition-all duration-500",
                  i === activeIndex ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5",
                ].join(" ")}
              >
                <h3 className="cormorant-garamond-700 text-primary text-2xl md:text-3xl lg:text-4xl mb-4 whitespace-normal">
                  {usp.title}
                </h3>
                <p className="montserrat-500 text-base lg:text-lg text-primary mb-5 leading-7 lg:leading-8">
                  {usp.description}
                </p>
                <Link href="/collections/all-dresses"
                  className={[
                    buttonVariants?.({ variant: "default" }) ?? "",
                    "rounded-full bg-primary hover:bg-primary/90 text-white px-6 py-2",
                    "montserrat-600 uppercase tracking-[0.08em] text-[13px] lg:text-[14px]",
                    "shadow-[0_8px_22px_rgba(166,77,121,0.25)] hover:shadow-[0_12px_28px_rgba(166,77,121,0.30)]",
                    "transition-all inline-flex items-center gap-2",
                  ].join(" ")}
                >
                  View Collection <span>→</span>
                </Link>
              </div>
            ))}
          </div>

          {/* Compact (mobile + tablet) slide — centered */}
          <div className="lg:hidden max-w-[720px] mx-auto leading-relaxed text-center">
            <h3 className="cormorant-garamond-700  uppercase  text-primary text-3xl md:text-4xl mb-3 text-center">
              {usps[activeIndex]?.title}
            </h3>
            <p className="montserrat-500 text-[15px] sm:text-base text-primary mb-4 leading-7 text-center">
              {usps[activeIndex]?.description}
            </p>
            <Link href="/collections/all-dresses"
              className={[
                buttonVariants?.({ variant: "default" }) ?? "",
                "rounded-full bg-primary hover:bg-primary/90 text-white px-5 py-2",
                "montserrat-600 uppercase tracking-[0.08em] text-[12px] sm:text-[13px]",
                "shadow-[0_8px_22px_rgba(166,77,121,0.25)] hover:shadow-[0_12px_28px_rgba(166,77,121,0.30)]",
                "transition-all inline-flex items-center gap-2",
                "mx-auto justify-center", // center the CTA
              ].join(" ")}
            >
              View Collection <span>→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
