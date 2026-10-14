'use client';
// src/components/product/CouponTicket.jsx
import React, { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import PropTypes from "prop-types";

const BRAND = "#642c44";

export default function CouponTicket({ title, subtitle, coupon = {}, onCopy, copied: copiedProp }) {
  const {
    code: rawCode = "NO-CODE",
    title: couponTitle,
    subtitle: couponSubtitle,
    text,
    subtext,
  } = coupon || {};

  const titleText = title || couponTitle || text || "Special Offer";
  const subtitleText = subtitle || couponSubtitle || subtext || "";
  const code = rawCode || "N/A";

  const [copied, setCopied] = useState(Boolean(copiedProp));
  useEffect(() => {
    if (typeof copiedProp !== "undefined") setCopied(Boolean(copiedProp));
  }, [copiedProp]);

  const handleCopy = async (codeToCopy) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(codeToCopy);
      }
    } catch {
      // Copy failures should not block the shopper.
    }

    if (typeof copiedProp === "undefined") {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    }

    if (typeof onCopy === "function") onCopy(codeToCopy);
  };

  return (
    <div className="flex h-full w-full min-w-0">
      <div
        className="flex h-full min-h-[58px] w-full items-center justify-between gap-2 rounded-[12px] border border-dashed bg-white px-3 py-2"
        style={{ borderColor: "rgba(100, 44, 68, 0.7)" }}
        role="group"
        aria-label={titleText}
      >
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[13px] font-medium leading-snug tracking-[0.025em]" style={{ color: BRAND }}>
            {titleText}
          </p>
          {subtitleText ? (
            <p className="mt-0.5 truncate text-[11px] leading-snug tracking-[0.25em]" style={{ color: "rgba(100, 44, 68, 0.72)" }}>
              {subtitleText}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => handleCopy(code)}
          aria-label={`Copy coupon code ${code}`}
          title={`Copy coupon code ${code}`}
          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-[8px] px-2 text-[10px] font-bold text-white transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          style={{ backgroundColor: BRAND }}
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-white/20 bg-white/10">
            {copied ? <Check size={10} /> : <Copy size={10} />}
          </span>
          <span className="max-w-[6.25rem] truncate">{copied ? "Copied" : code}</span>
        </button>
      </div>
    </div>
  );
}

CouponTicket.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  coupon: PropTypes.object,
  onCopy: PropTypes.func,
  copied: PropTypes.bool,
};

CouponTicket.defaultProps = {
  title: undefined,
  subtitle: undefined,
  coupon: {},
  onCopy: undefined,
  copied: undefined,
};
