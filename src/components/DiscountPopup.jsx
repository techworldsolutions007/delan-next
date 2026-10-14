'use client';
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from "react";

// --- Configuration ---
const DISCOUNT_CODE = "DELAN15";
const SESSION_STORAGE_KEY = "discount_popup_dismissed_session";

// Background image
const BG_IMAGE_URL =
  "https://cdn.shopify.com/s/files/1/0714/4420/1639/collections/Z-2000735_1_e1fafaa4-5f8d-4501-b1e2-90230fc84c5a.jpg?v=1760598327";

// --- Utilities ---
const copyToClipboard = (text) => {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
    return true;
  } catch (err) {
    console.error("Fallback: Could not copy text", err);
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
};

function DiscountPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const closeBtnRef = useRef(null);

  const router = useRouter();

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem(SESSION_STORAGE_KEY, "true");
  };

  const handleShopNow = () => {
    handleClose();
    router.push("/collections/offer");
  };

  const handleCopyCode = () => {
    if (copyToClipboard(DISCOUNT_CODE)) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Show popup after a random delay between 5s and 20s
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_STORAGE_KEY) === "true") return;

    const MIN_DELAY = 10000; // 10 seconds
    const MAX_DELAY = 20000; // 20 seconds
    const delay =
      Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1)) + MIN_DELAY;

    const timer = setTimeout(() => setIsOpen(true), delay);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isOpen) {
      closeBtnRef.current?.focus();
      const onKeyDown = (e) => e.key === "Escape" && handleClose();
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#4A1F33]/20 backdrop-blur-sm transition-opacity duration-500 ease-out"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="
          relative w-full max-w-[420px] overflow-hidden rounded-sm 
          bg-white
          border border-primary/10
          shadow-[0_0_0_1px_rgba(255,255,255,0.45),0_22px_45px_-18px_rgba(74,31,51,0.55),0_0_40px_rgba(100,44,68,0.45)]
          transition-all duration-500 transform
          scale-[0.8] md:scale-[0.9]
          font-secondary
        "
      >
        {/* --- Background Image Layer --- */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div
            className="absolute inset-0 bg-cover bg-top opacity-50 mix-blend-multiply"
            style={{ backgroundImage: `url("${BG_IMAGE_URL}")` }}
          />
          {/* Light Gradient Overlay to ensure text pop */}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent" />
        </div>

        {/* --- Close Button --- */}
        <button
          ref={closeBtnRef}
          onClick={handleClose}
          className="absolute top-3 right-3 z-20 p-2 text-primary/60 hover:text-primary hover:bg-primary/5 rounded-full transition-all"
          aria-label="Close"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* --- Content --- */}
        <div className="relative z-10 px-8 pt-12 pb-10 text-center">
          {/* Brand/Eyebrow */}
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary/60 mb-5">
            Limited Time Invitation
          </p>

          {/* Main Offer Title */}
          <div className="mb-4 text-primary">
            <p className="text-sm uppercase tracking-widest mb-2 font-medium">
              Enjoy
            </p>
            <div className="flex items-start justify-center leading-none font-primary">
              <span className="text-[7rem] leading-[0.85] font-medium">15</span>
              <div className="flex flex-col items-start mt-3 ml-2">
                <span className="text-3xl italic font-light">%</span>
                <span className="text-2xl uppercase tracking-[0.2em] -mt-1 font-light">
                  Off
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm font-medium text-primary/80 max-w-[260px] mx-auto mb-8 leading-relaxed">
            Refresh your look with our latest collection. <br />
            Use the code below at checkout.
          </p>

          {/* Coupon Code Box - Clean & Minimal */}
          <div className="mb-8 mx-2">
            <button
              onClick={handleCopyCode}
              className="
                group relative w-full flex items-center justify-between 
                bg-white border border-[#642c44]/20
                shadow-sm px-5 py-4 
                hover:border-[#642c44]/50 transition-all duration-300
              "
            >
              <span className="text-[10px] text-[#642c44]/50 uppercase tracking-widest font-bold">
                Voucher
              </span>
              <span className="text-xl tracking-[0.15em] text-[#642c44] font-semibold uppercase">
                {DISCOUNT_CODE}
              </span>

              {/* Copy Icon */}
              <div className="w-6 h-6 flex items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary transition-colors duration-300">
                {isCopied ? (
                  <svg
                    className="w-3 h-3 text-[#642c44] group-hover:text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-3 h-3 text-[#642c44] group-hover:text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </div>

              {/* Copied Feedback Tooltip */}
              <div
                className={`
                  absolute -top-9 left-1/2 -translate-x-1/2 
                  bg-[#4A1F33] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 
                  transition-all duration-300 pointer-events-none shadow-lg rounded-sm
                  ${
                    isCopied
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-2"
                  }
                `}
              >
                Copied!
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#4A1F33] rotate-45"></div>
              </div>
            </button>
          </div>

          {/* Primary CTA */}
          <button
            onClick={handleShopNow}
            className="
              w-full py-4 px-6 
              bg-primary text-white
              uppercase text-xs font-bold tracking-[0.25em]
              transition-all duration-300 shadow-[0_10px_30px_-10px_rgba(28,36,66,0.4)]
              hover:bg-primary/90
              active:scale-[0.99]
            "
          >
            Unlock the Discount
          </button>

          <p className="mt-6 text-[9px] text-primary/40 uppercase tracking-widest">
            *Terms & conditions apply.
          </p>
        </div>
      </div>
    </div>
  );
}

export default DiscountPopup;
