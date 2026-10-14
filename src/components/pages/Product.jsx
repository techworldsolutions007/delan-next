'use client';
import { useParams } from 'next/navigation';
// src/pages/Product.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import ProductHeader from "../Product/ProductHeader";
import LazySection from "@/components/LazySection";

import MobileAddToCartCTA from "@/components/Product/MobileAddToCartCTA";
import SuggestionPopUp from "@/components/Product/SuggestionPopUp";
import ProductUGCVideoPopup from "@/components/ProductUGCVideoPopup/ProductUGCVideoPopup";
import { rememberRecentlyViewedHandle } from "@/lib/recentlyViewedStore";

const TopProductsMarquee = React.lazy(() => import("../Product/TopProductsMarquee"));
const ProductUSP = React.lazy(() => import("../Product/ProductUSP"));
const ProductBanner = React.lazy(() => import("../Product/ProductBanner"));
const CuratedCollections = React.lazy(() => import("../home/CuratedCollections"));
const SuggestionSection = React.lazy(() => import("../Product/SuggestionSection"));

const RecentlyViewed = React.lazy(() => import("../Product/RecentlyViewed"));
const ProductReview = React.lazy(() => import("../Product/ProductReview"));

const PRODUCT_SECTION_CONFIG = [
  {
    key: "product-usp",
    minHeight: "55vh",
    mobileMinHeight: "140px",
    rootMargin: "350px 0px",
    render: () => <ProductUSP />,
  },
  // {
  //   key: "product-banner",
  //   minHeight: "60vh",
  //   rootMargin: "1200px 0px",
  //   render: () => <ProductBanner />,
  // },
  {
    key: "curated-collections",
    minHeight: "60vh",
    mobileMinHeight: "220px",
    rootMargin: "350px 0px",
    render: () => <CuratedCollections />,
  },
  {
    key: "suggestions",
    minHeight: "60vh",
    mobileMinHeight: "220px",
    rootMargin: "350px 0px",
    render: () => <SuggestionSection />,
  },

  {
    key: "recently-viewed",
    minHeight: "50vh",
    mobileMinHeight: "120px",
    rootMargin: "350px 0px",
    render: () => <RecentlyViewed />,
  },
  {
    key: "product-review",
    id: "customer-reviews-section",
    className: "scroll-mt-24",
    minHeight: "70vh",
    mobileMinHeight: "180px",
    rootMargin: "350px 0px",
    render: () => <ProductReview />,
  },
];

const Product = ({ handle: handleProp, params } = {}) => {
  const routerParams = useParams();
  const { handle: paramsHandle } = params || {};
  const handle = handleProp || paramsHandle || routerParams?.handle;
  const [hasReviews, setHasReviews] = React.useState(false);

  // UGC video popup state
  const [pdpProduct, setPdpProduct] = useState(null);
  const cartAddRef = useRef(null);

  const handleProductLoaded = useCallback((product, doCartLinesAdd) => {
    setPdpProduct(product);
    cartAddRef.current = doCartLinesAdd;
  }, []);

  const handleUGCAddToCart = useCallback(async (variantId) => {
    if (typeof cartAddRef.current === "function") {
      await cartAddRef.current(variantId, 1);
    }
  }, []);

  useEffect(() => {
    if (!handle) return;
    setHasReviews(false);
    setPdpProduct(null);
    rememberRecentlyViewedHandle(handle);
  }, [handle]);

  return (
    <main>
      {/* <LazySection
        eager
        minHeight="120px"
        rootMargin="0px"
        placeholder={null}
        render={() => <TopProductsMarquee fullBleed={false} />}
      /> */}

      {/* Desktop & tablet social-proof popup (hidden on mobile by the component itself) */}
      {/* <SuggestionPopUp
        initialOpen={true}
        showDelayMs={6000} // Increased delay (6s gap)
        autoHideMs={6000}  // 6s visibility
        threshold={500}    // Only show after scrolling 500px
        manualCloseDelayMs={10000} // Wait 10s if user closes it
      /> */}

      {/* Wrap page content so MobileAddToCartCTA can receive onCtaChange */}
      <MobileAddToCartCTA>
        {(onCtaChange) => (
          <>
            {/* Product header (sends CTA info via onCtaChange) */}
            <ProductHeader
              onCtaChange={onCtaChange}
              onReviewStateChange={setHasReviews}
              onProductLoaded={handleProductLoaded}
            />
            {PRODUCT_SECTION_CONFIG.filter((section) => section.key !== "product-review" || hasReviews).map(({ key, ...sectionProps }) => (
              <LazySection key={key} {...sectionProps} />
            ))}
          </>
        )}
      </MobileAddToCartCTA>

      {/* Floating UGC video popup — only renders if product has Shopify video */}
      <ProductUGCVideoPopup
        product={pdpProduct}
        onAddToCart={handleUGCAddToCart}
      />
    </main>
  );
};

export default Product;
