'use client';
import React, { useCallback, useMemo, useState } from "react";
import CouponTicket from "./CouponTicket";

export const DEFAULT_COUPONS = [
  { code: "DELANFAMILY", text: "Enjoy 10% OFF on your first order", amount: 0, items: 0 },
  { code: "5FCAS1Y86JBC", text: "Flat 10% OFF on Denim Edit", amount: 0, items: 0 },
];

export default function CouponCarousel({ coupons = DEFAULT_COUPONS }) {
  const [copiedCode, setCopiedCode] = useState("");

  const items = useMemo(
    () => (coupons || []).map((c) => ({ ...c, title: c.title || c.text || "" })),
    [coupons]
  );

  const copy = useCallback(async (code) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const ta = document.createElement("textarea");
        ta.value = code;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(""), 1400);
    } catch {
    }
  }, []);

  return (
    <div className="py-1.5 sm:py-2">
      <div
        className="flex gap-2.5 overflow-x-auto scroll-smooth snap-x snap-mandatory no-scrollbar sm:gap-3 sm:overflow-visible"
        data-hide-scrollbar
      >
        {items.map((coupon) => (
          <div key={coupon.code} className="min-w-0 shrink-0 snap-start basis-[86%] sm:basis-0 sm:flex-1">
            <CouponTicket
              coupon={coupon}
              onCopy={copy}
              copied={copiedCode === coupon.code}
              title={coupon.title}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
