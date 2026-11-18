'use client';
import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useMotionValue, useSpring } from "motion/react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

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

      window.history.pushState({ modal: "product-gallery" }, "");

      const handlePopState = () => {
        isClosingViaBackRef.current = true;
        onClose();
      };

      window.addEventListener("popstate", handlePopState);
      return () => {
        window.removeEventListener("popstate", handlePopState);
        document.body.style.overflow = "";
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
  const localIsZoomedRef = useRef(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);

  const springConfig = { stiffness: 400, damping: 40, mass: 0.5 };
  const smoothX = useSpring(x, springConfig);
  const smoothY = useSpring(y, springConfig);
  const smoothScale = useSpring(scale, springConfig);

  const startDistanceRef = useRef(0);
  const startScaleRef = useRef(1);
  const panStartRef = useRef(null);

  // Compute pan bounds from current scale so user can traverse the full zoomed image
  const clampPan = useCallback((nx, ny, currentScale) => {
    if (!containerRef.current || currentScale <= 1) return { cx: 0, cy: 0 };
    const { width, height } = containerRef.current.getBoundingClientRect();
    const maxX = (width * (currentScale - 1)) / 2;
    const maxY = (height * (currentScale - 1)) / 2;
    return {
      cx: Math.max(-maxX, Math.min(maxX, nx)),
      cy: Math.max(-maxY, Math.min(maxY, ny)),
    };
  }, []);

  useEffect(() => {
    const unsub = scale.onChange((v) => {
      const zoomed = v > 1.05;
      if (zoomed !== localIsZoomedRef.current) {
        localIsZoomedRef.current = zoomed;
        setLocalIsZoomed(zoomed);
        onZoomChange(zoomed);
      }
      if (!zoomed) {
        x.set(0);
        y.set(0);
      } else {
        const { cx, cy } = clampPan(x.get(), y.get(), v);
        x.set(cx);
        y.set(cy);
      }
    });
    return () => unsub();
  }, [scale, x, y, onZoomChange, clampPan]);

  // Touch: 2-finger pinch to zoom, 1-finger pan while zoomed
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      panStartRef.current = null;
      startDistanceRef.current = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      startScaleRef.current = scale.get();
    } else if (e.touches.length === 1 && localIsZoomedRef.current) {
      panStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        motionX: x.get(),
        motionY: y.get(),
      };
    }
  }, [scale, x, y]);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2 && startDistanceRef.current) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      const newScale = Math.min(Math.max(startScaleRef.current * (dist / startDistanceRef.current), 1), 3);
      scale.set(newScale);
    } else if (e.touches.length === 1 && panStartRef.current) {
      e.preventDefault();
      const dx = e.touches[0].clientX - panStartRef.current.x;
      const dy = e.touches[0].clientY - panStartRef.current.y;
      const { cx, cy } = clampPan(
        panStartRef.current.motionX + dx,
        panStartRef.current.motionY + dy,
        scale.get()
      );
      x.set(cx);
      y.set(cy);
    }
  }, [scale, x, y, clampPan]);

  const handleTouchEnd = useCallback(() => {
    panStartRef.current = null;
    startDistanceRef.current = 0;
  }, []);

  // Mouse: click-drag to pan while zoomed (desktop)
  const handleMouseDown = useCallback((e) => {
    if (!localIsZoomedRef.current) return;
    const start = { x: e.clientX, y: e.clientY, motionX: x.get(), motionY: y.get() };
    let moved = false;

    const onMove = (ev) => {
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      if (!moved && Math.hypot(dx, dy) > 4) moved = true;
      if (moved) {
        const { cx, cy } = clampPan(start.motionX + dx, start.motionY + dy, scale.get());
        x.set(cx);
        y.set(cy);
      }
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [x, y, scale, clampPan]);

  // Double-tap / double-click to toggle zoom
  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (scale.get() > 1.1) { scale.set(1); x.set(0); y.set(0); }
      else { scale.set(2); }
    }
    lastTapRef.current = now;
  }, [scale, x, y]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center overflow-hidden touch-none select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
    >
      <motion.div
        style={{
          x: smoothX,
          y: smoothY,
          scale: smoothScale,
          willChange: "transform",
          cursor: localIsZoomed ? "grab" : "zoom-in",
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
