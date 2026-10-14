'use client';
import React, { useRef } from "react";
import Image from "next/image";
import { PRESS_LOGOS } from "./pressLogos";
import {
  Marquee,
  MarqueeContent,
  MarqueeItem,
} from "@/components/ui/shadcn-io/marquee";

export default function PressStrip({
  outerClassName = "",
  containerClassName = "bg-accent",
}) {
  const trackRef = useRef(null);

  return (
    <section className={outerClassName} aria-label="Press features">
      <div className="mx-auto max-w-8xl">
        <div
          className={`flex w-full items-center justify-center ${containerClassName}`}
          ref={trackRef}
          aria-hidden={false}
        >
          <Marquee>
            <MarqueeContent>
              {PRESS_LOGOS.map((logo, index) => (
                <MarqueeItem
                  className="flex items-center justify-center p-2 py-5"
                  key={`${logo.name}-${index}`}
                >
                  <Image
                    src={logo.logo}
                    alt={logo.alt}
                    width={0}
                    height={0}
                    sizes="200px"
                    className="h-10 w-auto object-contain px-5 transition-[filter,opacity] duration-500 sm:h-12 md:h-12 md:px-20"
                    style={{ filter: "grayscale(100%) opacity(60%)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.filter = "grayscale(0%) opacity(100%)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.filter = "grayscale(100%) opacity(60%)";
                    }}
                    draggable={false}
                  />
                </MarqueeItem>
              ))}
            </MarqueeContent>
          </Marquee>
        </div>
      </div>
    </section>
  );
}
