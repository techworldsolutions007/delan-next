'use client';
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
const ajio = "/logos/ajio.svg";
const nykaa = "/logos/nykaa.svg";

import {
  Marquee,
  MarqueeContent,
  MarqueeFade,
  MarqueeItem,
} from "@/components/ui/shadcn-io/marquee";

const MARKETPLACES = [
  { name: "AJIO", alt: "AJIO", logo: ajio },
  { name: "Nykaa", alt: "nykaa", logo: nykaa },
];

function LogoRow() {
  return (
    <ul
      className="logo-row flex items-center justify-around px-2 sm:px-4 md:px-6"
      role="list"
      aria-hidden="true"
    >
      {MARKETPLACES.map((mp, i) => (
        <li
          key={`${mp.name}-${i}`}
          className="logo-item flex-none flex items-center justify-center"
          title={mp.name}
        >
          <Image
            src={mp.logo}
            alt={mp.alt}
            width={0}
            height={0}
            sizes="150px"
            className="logo-img block w-auto max-w-full max-h-6 sm:max-h-8 md:max-h-10"
            draggable={false}
          />
        </li>
      ))}
    </ul>
  );
}

const AvailBanner = ({ duration = "22s" }) => {
  const trackRef = useRef(null);
  const slideRef = useRef(null);
  const [slidePx, setSlidePx] = useState(0);
  const prefersReducedMotion =
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  useEffect(() => {
    if (typeof window === "undefined") return;

    function measure() {
      const el = slideRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = Math.round(rect.width);
      setSlidePx(px);
      if (trackRef.current) {
        trackRef.current.style.setProperty("--mq-distance-px", `${px}px`);
      }
    }

    const id = window.setTimeout(measure, 50);

    let ro;
    try {
      ro = new ResizeObserver(measure);
      if (slideRef.current) ro.observe(slideRef.current);
      if (trackRef.current) ro.observe(trackRef.current);
    } catch (e) {
      window.addEventListener("resize", measure);
    }

    const imgs = trackRef.current?.querySelectorAll("img") ?? [];
    const onImgLoad = () => measure();
    imgs.forEach((img) => {
      if (!img.complete) img.addEventListener("load", onImgLoad);
    });

    return () => {
      window.clearTimeout(id);
      imgs.forEach((img) => img.removeEventListener("load", onImgLoad));
      if (ro) {
        try {
          ro.disconnect();
        } catch (_) {}
      } else {
        window.removeEventListener("resize", measure);
      }
    };
  }, []);

  const animationEnabled = !prefersReducedMotion && slidePx > 0;

  // Build a repeated list of marketplace items so the marquee has enough content to scroll smoothly
  const repeat = 4; // tweak this number if you want a denser or sparser marquee
  const marqueeItems = Array.from(
    { length: MARKETPLACES.length * repeat },
    (_, i) => MARKETPLACES[i % MARKETPLACES.length]
  );

  return (
    <div className="w-full bg-white pb-5 pt-10 overflow-hidden">
      <div className="mb-6 text-center">
        <h2 className="cormorant-garamond-700 text-primary text-3xl md:text-4xl">
          AVAILABLE ON
        </h2>
        <p className="text-primary montserrat-500 tracking-[0.05em] pb-2">
          Shop from your favorite marketplaces
        </p>
      </div>

      <div
        className="flex size-full items-center justify-center bg-accent"
        ref={trackRef}
        aria-hidden={false}
      >
        <Marquee>
          <MarqueeContent>
            {marqueeItems.map((mp, index) => (
              <MarqueeItem
                className="flex items-center justify-center p-2 py-5"
                key={`${mp.name}-${index}`}
              >
                <Image
                  src={mp.logo}
                  alt={mp.alt}
                  width={0}
                  height={0}
                  sizes="200px"
                  className="h-10 w-auto sm:h-12 md:h-12 object-contain px-5 md:px-20"
                  draggable={false}
                />
              </MarqueeItem>
            ))}
          </MarqueeContent>
        </Marquee>
      </div>
    </div>
  );
};

export default AvailBanner;
