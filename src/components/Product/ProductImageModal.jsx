'use client';
import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "motion/react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * ProductImageModal - Stabilized Version
 * Corrects AnimatePresence placement and history navigation logic.
 */
export default function ProductImageModal({
  isOpen,
  onClose,
  images = [],
  initialIndex = 0,
}) {
  const [index, setIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const isClosingViaBackRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setIndex(initialIndex);
      setIsZoomed(false);
      isClosingViaBackRef.current = false;
      document.body.style.overflow = "hidden";

      // Add state to history
      window.history.pushState({ modal: "product-gallery" }, "");

      const handlePopState = (e) => {
        isClosingViaBackRef.current = true;
        onClose();
      };

      window.addEventListener("popstate", handlePopState);
      return () => {
        window.removeEventListener("popstate", handlePopState);
        document.body.style.overflow = ""; 
        
        // Only call back() if we didn't get here via the back button
        if (!isClosingViaBackRef.current && window.history.state?.modal === "product-gallery") {
            window.history.back();
        }
      };
    }
  }, [isOpen, initialIndex, onClose]);

  const handleNext = useCallback(() => {
    if (index < images.length - 1) {
        setIndex(index + 1);
        setIsZoomed(false);
    }
  }, [index, images.length]);

  const handlePrev = useCallback(() => {
    if (index > 0) {
        setIndex(index - 1);
        setIsZoomed(false);
    }
  }, [index]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-0 m-0 select-none touch-none overflow-hidden"
        >
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 p-4 z-[110] flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
            <div className="text-white text-sm font-medium montserrat-500">
              {index + 1} / {images.length}
            </div>
            <button
              onClick={onClose}
              className="p-3 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 active:scale-95 transition-transform"
              aria-label="Close"
            >
              <X size={26} />
            </button>
          </div>

          {/* Gallery */}
          <div className="relative w-full h-full flex items-center justify-center">
            <motion.div
              className="w-full h-full flex items-center justify-center"
              drag={!isZoomed ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.1}
              onDragEnd={(e, { offset }) => {
                if (isZoomed) return;
                const swipe = offset.x;
                if (swipe < -60 && index < images.length - 1) handleNext();
                else if (swipe > 60 && index > 0) handlePrev();
              }}
            >
              <ZoomableImage
                key={images[index]?.url}
                url={images[index]?.url}
                alt={images[index]?.altText || `Product Image ${index + 1}`}
                onZoomChange={setIsZoomed}
                onSwipeDown={onClose}
              />
            </motion.div>

            {!isZoomed && (
                <>
                  {index > 0 && (
                      <button onClick={handlePrev} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white z-[110]">
                          <ChevronLeft size={28} />
                      </button>
                  )}
                  {index < images.length - 1 && (
                      <button onClick={handleNext} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white z-[110]">
                          <ChevronRight size={28} />
                      </button>
                  )}
                </>
            )}
          </div>
          
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ZoomableImage({ url, alt, onZoomChange, onSwipeDown }) {
  const containerRef = useRef(null);
  const lastTapRef = useRef(0);
  const [localIsZoomed, setLocalIsZoomed] = useState(false);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);

  const springConfig = { stiffness: 450, damping: 45, mass: 0.5 };
  const smoothX = useSpring(x, springConfig);
  const smoothY = useSpring(y, springConfig);
  const smoothScale = useSpring(scale, springConfig);

  const startDistanceRef = useRef(0);
  const startScaleRef = useRef(1);

  useEffect(() => {
    const unsub = scale.onChange((v) => {
        const zoomed = v > 1.05;
        if (zoomed !== localIsZoomed) {
            setLocalIsZoomed(zoomed);
            onZoomChange(zoomed);
        }
        if (!zoomed) { x.set(0); y.set(0); }
    });
    return () => unsub();
  }, [scale, x, y, onZoomChange, localIsZoomed]);

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      startDistanceRef.current = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
      startScaleRef.current = scale.get();
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && startDistanceRef.current) {
      const distance = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
      scale.set(Math.min(Math.max(startScaleRef.current * (distance / startDistanceRef.current), 1), 3));
    }
  };

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (scale.get() > 1.1) { scale.set(1); x.set(0); y.set(0); }
      else { scale.set(2); }
    }
    lastTapRef.current = now;
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full flex items-center justify-center overflow-hidden touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <motion.div
        drag={localIsZoomed}
        dragConstraints={containerRef}
        dragElastic={0.1}
        dragMomentum={true}
        style={{ 
          x: localIsZoomed ? smoothX : 0, 
          y: localIsZoomed ? smoothY : 0, 
          scale: smoothScale,
          willChange: "transform"
        }}
        onClick={handleTap}
        className="relative w-full h-full flex items-center justify-center p-4"
      >
        <Image src={url} alt={alt} fill className="object-contain pointer-events-none" draggable={false} />
      </motion.div>

      {!localIsZoomed && (
          <motion.div 
            className="absolute inset-x-0 top-0 h-1/4 z-[105]"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset }) => { if (offset.y > 80) onSwipeDown(); }}
          />
      )}
    </div>
  );
}
