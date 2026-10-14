'use client';
// src/components/Marquee.jsx
import React from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";

const PercentIcon = "/icons/percent.svg";
const FreeDeliveryIcon = "/icons/free-delivery.svg";
const SecureIcon = "/icons/securecard.png";

const BRAND = "var(--brand-642, #642c44)";

const DEFAULT_ITEMS = [
  {
    icon: PercentIcon,
    text: "10% Off for New Customers",
  },
  {
    icon: FreeDeliveryIcon,
    text: "Free Delivery Above ₹1999",
  },
  {
    icon: SecureIcon,
    text: "Secure Payments & COD Available",
  },
];



export default function Marquee({
  items = DEFAULT_ITEMS,
  speed = 35, // seconds for one full loop
  gap = "1.25rem", // space between badges
  pauseOnHover = true, // pauses animation on hover
}) {
  // Make multiple copies for seamless continuous loop
  const lane = [...items, ...items, ...items, ...items, ...items, ...items];

  return (
    <div
      className="relative w-full overflow-hidden border-b"
      style={{ backgroundColor: BRAND }}
      role="region"
      aria-label="Store promotions"
    >
      {/* Group to allow pause-on-hover via Tailwind arbitrary property */}
      <div
        className={`group mx-auto max-w-[1400px] px-3 py-2 sm:px-6`}
        style={{ ["--dur"]: `${speed}s`, ["--gap"]: gap }}
      >
        {/* Lane */}
        <div
          className={[
            "flex w-max items-center",
            "motion-reduce:animate-none",
          ].join(" ")}
          style={{
            gap: `var(--gap)`,
            animation: `marquee var(--dur) linear infinite`,
            willChange: "transform",
            ...(pauseOnHover ? { ["--paused"]: "paused" } : {}),
          }}
        >
          {lane.map((item, i) => (
            <Badge
              key={`${item.text}-${i}`}
              className="whitespace-nowrap text-[15px] sm:text-[16px] text-white font-medium bg-transparent border-0 px-3 py-1 flex items-center gap-2 tracking-[0.025em] uppercase"
            >
              <Image
                src={item.icon}
                alt=""
                width={28}
                height={28}
                className={item.icon === FreeDeliveryIcon ? "w-8 h-8 sm:w-9 sm:h-9 brightness-0 invert" : "w-6 h-6 sm:w-7 sm:h-7"}
              />
              {item.text}
            </Badge>
          ))}
        </div>

        {/* Pause on hover (via arbitrary property) */}
        {pauseOnHover && (
          <style>{`
            .group:hover > div[style*="marquee"] { animation-play-state: paused; }
          `}</style>
        )}
      </div>

      {/* Keyframes (scopes to this file) */}
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes marquee { from { transform: none; } to { transform: none; } }
        }
      `}</style>
    </div>
  );
}
