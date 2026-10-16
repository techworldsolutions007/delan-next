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

const SuggestionSection = React.lazy(() => import("../Product/SuggestionSection"));

const PRODUCT_SECTION_CONFIG = [
  {
    key: "suggestions",
    minHeight: "60vh",
    mobileMinHeight: "220px",
    rootMargin: "350px 0px",
    render: () => <SuggestionSection title="Recommended Products" />,
  },
];

const Product = ({ handle: handleProp, params } = {}) => {
  const routerParams = useParams();
  const { handle: paramsHandle } = params || {};
  const handle = handleProp || paramsHandle || routerParams?.handle;

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
              onProductLoaded={handleProductLoaded}
            />
            {PRODUCT_SECTION_CONFIG.map(({ key, ...sectionProps }) => (
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
