'use client';
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Play, X } from "lucide-react";
import getProductUGCVideo from "@/utils/getProductUGCVideo";
import { useQuickBuy } from "@/context/QuickBuyContext";
import "./ProductUGCVideoPopup.css";



/**
 * ProductUGCVideoPopup
 *
 * A floating UGC-style video popup for the PDP.
 * Shows a small auto-playing preview; opens a reel-style modal on click.
 */
export default function ProductUGCVideoPopup({ product, onAddToCart }) {
  const [shouldLoadUgcVideo, setShouldLoadUgcVideo] = useState(false);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const previewVideoRef = useRef(null);
  const modalVideoRef = useRef(null);

  const { openQuickBuy } = useQuickBuy();

  /* ---- delay loading until window load + 2 seconds ---- */
  useEffect(() => {
    const handleLoad = () => {
      // After window.load fires, wait another 2 seconds to ensure everything else is smooth
      setTimeout(() => setShouldLoadUgcVideo(true), 2000);
    };

    if (document.readyState === "complete") {
      handleLoad();
    } else {
      window.addEventListener("load", handleLoad);
      return () => window.removeEventListener("load", handleLoad);
    }
  }, []);

  /* ---- responsive ---- */
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 1023px)").matches
      : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 1023px)");
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  /* ---- extract video ---- */
  const video = useMemo(() => getProductUGCVideo(product), [product]);

  /* ---- show popup after delay (once shouldLoadUgcVideo is true) ---- */
  useEffect(() => {
    if (!video || dismissed || !shouldLoadUgcVideo) return;
    const timer = setTimeout(() => setVisible(true), 1000);
    return () => clearTimeout(timer);
  }, [video, dismissed, shouldLoadUgcVideo]);

  /* ---- auto-play preview (force for mobile) ---- */
  useEffect(() => {
    if (!visible || !previewVideoRef.current) return;
    
    const v = previewVideoRef.current;
    v.muted = true;
    v.playsInline = true;
    
    const playPromise = v.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.warn("Autoplay was prevented:", error);
      });
    }
  }, [visible]);

  /* ---- lock body scroll on modal ---- */
  useEffect(() => {
    if (!modalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [modalOpen]);

  /* ---- derived product data ---- */
  const variants = product?.variants?.edges || [];
  const firstAvailableVariant = useMemo(() => {
    const found = variants.find(
      (e) =>
        e?.node?.availableForSale &&
        (e.node.quantityAvailable == null || e.node.quantityAvailable > 0)
    );
    return found?.node || variants[0]?.node || null;
  }, [variants]);

  const productImage = useMemo(() => {
    const featImg = product?.featuredImage?.url;
    if (featImg) return featImg;
    const firstImg = product?.images?.edges?.[0]?.node?.url;
    return firstImg || null;
  }, [product]);

  const productPrice = useMemo(() => {
    const amt = firstAvailableVariant?.price?.amount;
    if (!amt) return "";
    return `Rs. ${Number(amt).toLocaleString("en-IN")}`;
  }, [firstAvailableVariant]);

  const hasMultipleVariants = variants.length > 1;

  /* ---- handlers ---- */
  const handleDismiss = useCallback(
    (e) => {
      e.stopPropagation();
      setDismissed(true);
      setVisible(false);
    },
    []
  );

  const openModal = useCallback(() => {
    setModalOpen(true);
    // On open from user click, we attempt unmuted autoplay
    setIsMuted(false);
  }, []);

  useEffect(() => {
    if (modalOpen && modalVideoRef.current) {
      const v = modalVideoRef.current;
      v.muted = isMuted;
      const playPromise = v.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Fallback to muted if unmuted autoplay is blocked by browser policy
          v.muted = true;
          setIsMuted(true);
          v.play().catch(() => {});
        });
      }
    }
  }, [modalOpen, isMuted]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    if (modalVideoRef.current) {
      modalVideoRef.current.pause();
      modalVideoRef.current.currentTime = 0;
    }
  }, []);

  const toggleMute = useCallback((e) => {
    e.stopPropagation();
    setIsMuted(prev => !prev);
  }, []);

  const handleOverlayClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) closeModal();
    },
    [closeModal]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") closeModal();
    },
    [closeModal]
  );

  useEffect(() => {
    if (!modalOpen) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, handleKeyDown]);

  const handleAddToBag = useCallback(async () => {
    if (hasMultipleVariants) {
      closeModal();
      openQuickBuy({
        handle: product.handle,
        title: product.title,
        price: firstAvailableVariant?.price?.amount || "0",
        imageUrl: productImage,
      });
      return;
    }

    if (!firstAvailableVariant?.id || typeof onAddToCart !== "function") return;

    try {
      setAdding(true);
      closeModal();
      await onAddToCart(firstAvailableVariant.id);
    } catch {
    } finally {
      setAdding(false);
    }
  }, [hasMultipleVariants, product, firstAvailableVariant, productImage, onAddToCart, closeModal, openQuickBuy]);

  /* ---- do not render if not ready or no video ---- */
  if (!shouldLoadUgcVideo || !video) return null;

  const posClass = isMobile ? "ugc-popup--mobile" : "ugc-popup--desktop";

  return (
    <>
      {/* ===== Floating Popup ===== */}
      {visible && !dismissed && !modalOpen && createPortal(
        <div className={`ugc-popup ${posClass}`}>
          <button
            type="button"
            className="ugc-popup__close"
            onClick={handleDismiss}
            aria-label="Close video popup"
          >
            <X size={14} strokeWidth={2.5} />
          </button>

          <button
            type="button"
            className="ugc-popup__video-wrap"
            onClick={openModal}
            aria-label="Watch product video"
            style={{ cursor: "pointer", padding: 0, border: "none" }}
          >
            <video
              ref={previewVideoRef}
              className="ugc-popup__video"
              src={video.src}
              poster={video.poster || undefined}
              muted
              loop
              playsInline
              autoPlay
              preload="auto"
              aria-hidden="true"
            />

            <span className="ugc-popup__play-badge" aria-hidden="true">
              <Play className="ugc-popup__play-icon" fill="currentColor" stroke="none" />
            </span>
          </button>
        </div>,
        document.body
      )}

      {/* ===== Full-Screen Modal ===== */}
      {modalOpen && createPortal(
        <div
          className="ugc-modal-overlay"
          onClick={handleOverlayClick}
          role="dialog"
          aria-modal="true"
          aria-label="Product video"
        >
          <div className="ugc-modal">
            <button
              type="button"
              className="ugc-modal__close"
              onClick={closeModal}
              aria-label="Close video modal"
            >
              <X size={20} strokeWidth={2.5} />
            </button>

            {/* Custom Mute Toggle */}
            <button
              type="button"
              className="ugc-modal__mute-toggle"
              onClick={toggleMute}
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
                </svg>
              )}
            </button>

            <video
              ref={modalVideoRef}
              className="ugc-modal__video"
              src={video.src}
              poster={video.poster || undefined}
              autoPlay
              playsInline
              loop
              muted={isMuted}
            />

            {/* Product card overlay */}
            <div className="ugc-modal__product-card">
              {productImage && (
                <img
                  className="ugc-modal__product-thumb"
                  src={productImage}
                  alt={product?.title || "Product"}
                  loading="lazy"
                />
              )}

              <div className="ugc-modal__product-info">
                <p className="ugc-modal__product-title">
                  {product?.title || ""}
                </p>
                <p className="ugc-modal__product-price">{productPrice}</p>
              </div>

              <button
                type="button"
                className="ugc-modal__add-btn"
                onClick={handleAddToBag}
                disabled={adding || (firstAvailableVariant && !firstAvailableVariant.availableForSale)}
                aria-label="Add to bag"
              >
                {adding ? "ADDING..." : hasMultipleVariants ? "SELECT OPTIONS" : "ADD TO BAG"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
