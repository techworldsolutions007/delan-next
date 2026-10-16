'use client';
import Link from 'next/link';

//&& src/components/HeroSlider.jsx
import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const MOBILE_VIDEO =
  // "https://cdn.shopify.com/videos/c/o/v/655f320b8f7149ebb1e30eaa7d611877.mp4";
  // "https://cdn.shopify.com/videos/c/o/v/bf48e08356fd4d7d971f8a3a66131122.mp4";   // old shoot image
  // "https://cdn.shopify.com/videos/c/o/v/2301102dcccc46d9a9fd00bfe01c6e09.mp4";
  // "https://cdn.shopify.com/videos/c/o/v/e6c4c617312b438d862261d0ede59200.mp4"     ; // NEW SHOOT 2026 SUMMER SOMEWHERE
  "https://cdn.shopify.com/videos/c/o/v/b6edf78cefac48269f175b09c93349cf.mp4";     // summer somewhere lauch 
const DESKTOP_VIDEO =
  // "https://cdn.shopify.com/videos/c/o/v/bc515a0e925647a392419c54cd24acee.mp4";    // old video
  // "https://cdn.shopify.com/videos/c/o/v/5339c77954034e89bba4677491c5ef0c.mp4";     // GGN shoot
  // "https://cdn.shopify.com/videos/c/o/v/a2692ce6533142bb84f9a4583d12cade.mp4";    // 21:9 FLY
// "https://cdn.shopify.com/videos/c/o/v/b9d3b32ed547424e8339851ee5ceacef.mp4";   // 16: 9 FLY
// "https://cdn.shopify.com/videos/c/o/v/83c8e215ec98410aad0325571090e4bf.mp4";   // NEW SHOOT 2026 SUMMER SOMEWHERE
"https://cdn.shopify.com/videos/c/o/v/f849721f47a942a5bd6850ffb627e23e.mp4";     // summer somewhere lauch 



// 📝 Adjust these ratios to fit your video content perfectly without cropping
// Common options:
//   Desktop → "21/9" (cinematic, shortest), "16/9" (standard), "4/3" (taller)
//   Mobile  → "4/5" (balanced portrait), "1/1" (square), "9/16" (full tall)
const VIDEO_RATIO_MOBILE = "9/16";   // balanced portrait on mobile
const VIDEO_RATIO_DESKTOP = "21/9"; // cinematic ultrawide – much shorter height

const HERO_POSTER =
  // "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/frame-96.jpg?v=1782459615";
  "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/WhatsApp_Image_2026-07-13_at_1.10.42_PM.jpg?v=1783928461"

function detectIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPhone|iPad|iPod/i.test(ua);
}

export default function HeroSlider() {
  const [isIOS, setIsIOS] = useState(false);
  const videoRef = useRef(null);

  // Detect iOS only on client
  useEffect(() => {
    setIsIOS(detectIOS());
  }, []);

  // Kick off autoplay AFTER a small delay so CDN can serve other assets first
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Give iOS a bit more time before we start pulling 100+ MB
    const delay = isIOS ? 1500 : 500; // ms

    const timer = setTimeout(() => {
      // For safety, ensure it's muted & inline (iOS requirement for autoplay)
      video.muted = true;
      video.playsInline = true;

      // Start loading & playing
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          // If autoplay fails (rare), do nothing – poster will stay visible
        });
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [isIOS]);

  return (
    <div
      role="region"
      aria-label="Hero slider"
      aria-roledescription="carousel"
      aria-live="polite"
      className="relative w-full overflow-hidden bg-neutral-100 group"
      style={{
        aspectRatio: VIDEO_RATIO_MOBILE,
        height: 'auto'
      }}
    >
      <style>{`
        @media (min-width: 768px) {
          [aria-label="Hero slider"] {
            aspect-ratio: ${VIDEO_RATIO_DESKTOP} !important;
          }
        }
      `}</style>
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        muted
        loop
        playsInline
        autoPlay
        preload={isIOS ? "none" : "metadata"}
        poster={HERO_POSTER}
        controls={false}
        disablePictureInPicture
        aria-label="Delan hero video"
        suppressHydrationWarning
      >
        {/* Desktop / Tablet source */}
        <source
          src={DESKTOP_VIDEO}
          type="video/mp4"
          media="(min-width: 768px)"
        />
        {/* Mobile source */}
        <source
          src={MOBILE_VIDEO}
          type="video/mp4"
          media="(max-width: 767px)"
        />
        Your browser does not support the video tag.
      </video>

      {/* Bottom Shade/Gradient Overlay */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent pointer-events-none transition-opacity duration-300 group-hover:from-black/60" />

      {/* CTA */}
      <div className="absolute inset-x-0 bottom-25 md:bottom-12 flex flex-col justify-center items-center z-10 gap-4 -translate-y-[20px] md:-translate-y-[5px]">
        <h1 className="sr-only">
          <span>Premium Women&apos;s Fashion</span>
          <span>Co-ord Sets · Dresses · Ethnic Wear · India</span>
        </h1>
        <Button
          asChild
          className="montserrat-700 uppercase leading-snug tracking-[0.3em] py-5 px-5 text-[14px] md:text-[15px] border border-white bg-transparent text-white hover:bg-white hover:text-primary transition-all duration-300 shadow-lg"
        >
          <Link href="/collections/summer-somewhere">
            Shop Now
          </Link>
        </Button>
      </div>
    </div>
  );
}
