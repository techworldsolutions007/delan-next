'use client';
// src/pages/Home.jsx
import React, { useEffect, useMemo, useState, Suspense } from "react";
import LazySection from "@/components/LazySection";
import NewsletterPopup from "../NewsletterPopup";
import HeroSection from "../home/HeroSection";
const CategoriesSection = React.lazy(() => import("../home/CategoriesSection"));
const InteractiveModelSection = React.lazy(() =>
  import("../home/InteractiveModelSection")
);
const StatsCounter = React.lazy(() => import("../home/StatsCounter"));
const CoOrdsSection = React.lazy(() => import("../home/CoOrdsSection"));
const TopProducts = React.lazy(() => import("../home/TopProducts"));
const StickyNav = React.lazy(() => import("../StickyNav"));
const CuratedCollections = React.lazy(() =>
  import("../home/CuratedCollections")
);
const Categories = React.lazy(() => import("../home/Categories"));
const UspShowcase = React.lazy(() => import("../home/UspShowcase"));
const WatchAndBuy = React.lazy(() => import("../home/WatchAndBuy"));
const OfferSection = React.lazy(() => import("../home/OfferSection"));
const TheCurrentEdit = React.lazy(() => import("../home/TheCurrentEdit"));
const FlippingCard = React.lazy(() => import("../home/FlippingCard"));
const AvailBanner = React.lazy(() => import("../home/AvailBanner"));
const PrMarquee = React.lazy(() => import("../home/PrMarquee"));
const DiscountPopup = React.lazy(() => import("../DiscountPopup"));
const Marquee = React.lazy(() => import("../Marquee"));
const VideoSection = React.lazy(() => import("../home/VideoSection"));
const ShopByPrint = React.lazy(() => import("../home/ShopByPrint"));
// const CategoryStories = React.lazy(() => import("../home/CategoryStories"));

/** Tabs for StickyNav (no Reviews; "Categories" shows collections) */
// const NAV_TABS = [
//   { key: "categories", label: "Categories", mode: "collections" },
//   {
//     key: "bestsellers",
//     label: "Bestsellers",
//     handle: "bestsellers",
//   },
//   { key: "trousers", label: "Trousers", handle: "denim-edit" },
//   { key: "short-dress", label: "Short Dress", handle: "short-dress" },
//   { key: "maxi-midi", label: "Maxi & Midi", handle: "maxi-midi-dress" },
//   { key: "co-ords", label: "Co-ords", handle: "co-ords" },
// ];

export default function Home() {
  // Show preloader only once per browser (localStorage flag)
  const [showPreloader, setShowPreloader] = useState(false);
  // useState(() => {
  //   if (typeof window === "undefined") return true;
  //   try {
  //     return localStorage.getItem("intro_seen") !== "1";
  //   } catch (_error) {
  //     return true;
  //   }
  // });

  useEffect(() => {
    if (showPreloader) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => document.body.classList.remove("overflow-hidden");
  }, [showPreloader]);

  const handleEnd = () => {
    // try {
    //   localStorage.setItem("intro_seen", "1");
    // } catch (_error) {
    //   // ignore
    // }
    setShowPreloader(false);
  };

  // Removed activeTab state
  // const [activeTab, setActiveTab] = useState(NAV_TABS[0]);

  // const topProps = useMemo(() => {
  //   if (activeTab.mode === "collections") {
  //     return { mode: "collections", title: "Shop By Category" };
  //   }
  //   return {
  //     mode: "products",
  //     handle: activeTab.handle || "top-products",
  //     title: activeTab.label || "Top Products",
  //   };
  // }, [activeTab]);

  const sections = useMemo(
    () => [
      {
        key: "denim-edit",
        minHeight: "60vh",
        render: () => <TopProducts handle="shop-all-new-in" title="NEW IN" productsFirst={4} />,
      },
      // Removed second marquee banner (was showing below hero section)
      // {
      //   key: "marquee-secondary",
      //   minHeight: "50px",
      //   render: () => (
      //     <div className="mb-5">
      //       <Marquee speed={35} gap="1.25rem" />
      //     </div>
      //   ),
      // },

      {
        key: "categories-section",
        minHeight: "60vh",
        render: () => <CategoriesSection />,
      },
      {
        key: "bestsellers",
        minHeight: "60vh",
        render: () => <TopProducts handle="bestsellers" title="BESTSELLERS" productsFirst={4} />,
      },
      {
        key: "watch-and-buy",
        minHeight: "70vh",
        render: () => <WatchAndBuy />,
      },
      // {
      //   key: "flipping-card",
      //   minHeight: "70vh",
      //   render: () => <FlippingCard />,
      // },
      {
        key: "pr-marquee",
        minHeight: "40vh",
        render: () => <PrMarquee />,
      },
      {
        key: "offer-section",
        minHeight: "40vh",
        // render: () => <OfferSection />,
        render: () => <TheCurrentEdit />,
      },
      // {
      //   key: "interactive-model",
      //   minHeight: "60vh",
      //   render: () => <InteractiveModelSection />,
      // },
      // {
      //   key: "stats-counter",
      //   minHeight: "40vh",
      //   render: () => <StatsCounter />,
      // },
      // {
      //   key: "co-ords",
      //   minHeight: "60vh",
      //   render: () => <CoOrdsSection />,
      // },
      {
        key: "top-products",
        minHeight: "90vh",
        rootMargin: "400px 0px",
        render: () => (
          <>
            <TopProducts
              key="collections-default"
              mode="collections"
              title="Shop By Category"
              showHeaderLink={false}
            />
          </>
        ),
      },
      // {
      //   key: "curated-collections",
      //   minHeight: "60vh",
      //   render: () => <CuratedCollections />,
      // },
      {
        key: "video-section",
        minHeight: "60vh",
        render: () => <VideoSection />,
      },
      // {
      //   key: "categories-grid",
      //   minHeight: "70vh",
      //   render: () => <Categories />,
      // },
      // {
      //   key: "usp-showcase",
      //   minHeight: "50vh",
      //   render: () => <UspShowcase />,
      // },
      {
        key: "shop-by-print",
        minHeight: "60vh",
        render: () => <ShopByPrint />,
      },
      // {
      //   key: "avail-banner",
      //   minHeight: "120px",
      //   rootMargin: "400px 0px",
      //   render: () => (
      //     <AvailBanner speed={20000} direction="right" gapClass="gap-16" />
      //   ),
      // },
    ],
    []
  );

  return (
    <main>
      {showPreloader ? (
        <Suspense fallback={null}>
          {/* <Preloader onVideoEnd={handleEnd} /> */}
        </Suspense>
      ) : (
        <>
          {/* Hero renders eagerly — no lazy boundary so LCP image is discovered immediately */}
          <HeroSection />
          {sections.map(({ key, ...section }) => (
            <LazySection key={key} {...section} />
          ))}

          {/* Discount popup (auto, random, one-time close) */}
          <Suspense fallback={null}>
            {/* <DiscountPopup /> */}
            {/* <NewsletterPopup /> */}
          </Suspense>
        </>
      )}
    </main>
  );
}
