'use client';
import React, { useEffect, useRef, useState } from "react";
import { shopify } from "@/lib/shopify";
import { NEWSLETTER_SIGNUP } from "@/lib/queries";

// --- Configuration ---
const NEWSLETTER_STORAGE_KEY = "newsletter_popup_dismissed_v1";
const DISMISSAL_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Background image (same as discount popup for visual consistency)
const BG_IMAGE_URL =
  "https://cdn.shopify.com/s/files/1/0714/4420/1639/collections/Z-2000735_1_058e7984-a9bb-433e-9545-1e9a3df3cf2d.jpg?v=1760597958"

const makeRandomPassword = () => {
  try {
    const arr = new Uint32Array(3);
    crypto.getRandomValues(arr);
    return Array.from(arr)
      .map((n) => n.toString(36))
      .join("-");
  } catch {
    return Math.random().toString(36).slice(2) + "-" + Date.now();
  }
};

function NewsletterPopup() {
  const [isOpen, setIsOpen] = useState(false);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState({ ok: false, msg: "" });

  const closeBtnRef = useRef(null);
  const overlayRef = useRef(null);

  const handleClose = () => {
    setIsOpen(false);
    try {
      if (typeof window !== "undefined") {
        const expiry = Date.now() + DISMISSAL_DURATION_MS;
        localStorage.setItem(NEWSLETTER_STORAGE_KEY, expiry.toString());
      }
    } catch (_) {
      // ignore
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) {
      handleClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitted || loading) return;

    if (!email.trim()) {
      return setStatus({ ok: false, msg: "Please enter your email." });
    }

    setLoading(true);
    setStatus({ ok: false, msg: "" });

    const MIN_DELAY_MS = 800;
    const start = Date.now();

    try {
      const password = makeRandomPassword();

      const data = await shopify(NEWSLETTER_SIGNUP, {
        email,
        acceptsMarketing: true,
        password,
        phone: null,
      });

      const errs =
        data?.customerCreate?.customerUserErrors ||
        data?.customerCreate?.userErrors ||
        [];
      if (errs.length) {
        throw new Error(errs.map((e) => e.message).join(", "));
      }

      const elapsed = Date.now() - start;
      if (elapsed < MIN_DELAY_MS) {
        await new Promise((res) => setTimeout(res, MIN_DELAY_MS - elapsed));
      }

      setSubmitted(true);
      setStatus({
        ok: true,
        msg: "Thanks for subscribing!",
      });

      // Auto-close popup shortly after successful subscribe
      setTimeout(() => {
        handleClose();
      }, 2500);
    } catch (err) {
      const elapsed = Date.now() - start;
      if (elapsed < MIN_DELAY_MS) {
        await new Promise((res) => setTimeout(res, MIN_DELAY_MS - elapsed));
      }

      setStatus({
        ok: false,
        msg:
          err?.message ||
          "Something went wrong while subscribing. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Show popup based on scroll or delay
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isDismissed = () => {
      try {
        const expiry = localStorage.getItem(NEWSLETTER_STORAGE_KEY);
        if (!expiry) return false;
        if (Date.now() > parseInt(expiry, 10)) {
          localStorage.removeItem(NEWSLETTER_STORAGE_KEY);
          return false;
        }
        return true;
      } catch (e) {
        return false;
      }
    };

    if (isDismissed()) return;

    let triggerTimer;
    let fallbackTimer;

    const triggerPopup = (delay = 0) => {
      if (triggerTimer || fallbackTimer === null) return; // Already triggered or inactive

      triggerTimer = setTimeout(() => {
        // Double check dismissal right before opening
        if (!isDismissed()) {
          setIsOpen(true);
        }
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }, delay);
    };

    const handleScroll = () => {
      const scrolled = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;

      // Prevent division by zero
      if (docHeight <= winHeight) return;

      const scrollPercent = (scrolled / (docHeight - winHeight)) * 100;

      if (scrollPercent > 30) {
        triggerPopup(3000); // 3s delay after hitting 30% scroll
        window.removeEventListener("scroll", handleScroll);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    // Fallback timer if user doesn't scroll much after 15s
    fallbackTimer = setTimeout(() => {
      if (!isOpen) {
        triggerPopup(0);
        window.removeEventListener("scroll", handleScroll);
      }
    }, 15000);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(triggerTimer);
      clearTimeout(fallbackTimer);
    };
  }, [isOpen]);

  // Accessibility: focus close button + ESC to close
  useEffect(() => {
    if (!isOpen) return;

    closeBtnRef.current?.focus();
    const onKeyDown = (e) => e.key === "Escape" && handleClose();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const isDisabled = loading || submitted;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity duration-500 ease-out cursor-pointer"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="
          relative w-full max-w-[420px] overflow-hidden rounded-md 
          bg-white
          border border-primary/10
          shadow-[0_0_0_1px_rgba(255,255,255,0.45),0_22px_45px_-18px_rgba(74,31,51,0.55),0_0_40px_rgba(100,44,68,0.45)]
          transition-all duration-500 transform
          scale-[0.8] md:scale-[1]
          font-secondary
          cursor-default
        "
      >
        {/* Background */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div
            className="absolute inset-0 bg-cover bg-top opacity-50 mix-blend-multiply"
            style={{ backgroundImage: `url("${BG_IMAGE_URL}")` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent" />
        </div>

        {/* Close Button - More Visible */}
        <button
          ref={closeBtnRef}
          onClick={handleClose}
          className="absolute top-4 right-4 z-20 p-2.5 bg-white/80 hover:bg-white text-[#642c44] rounded-full shadow-md border border-[#642c44]/10 transition-all hover:scale-110 active:scale-95"
          aria-label="Close"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Content */}
        <div className="relative z-10 px-8 pt-12 pb-10 text-center">
          {/* Eyebrow */}
          <p className="text-[10px] font-bold text-left uppercase tracking-[0.3em] text-primary/60 mb-5">
            Delan Newsletter
          </p>

          {/* Hero Title – now also Montserrat via font-secondary */}
          <div className="mb-4 text-primary mt-8">
            <p className="text-sm uppercase tracking-widest mb-2 font-medium text-left">
              Be the first to know
            </p>
            <div className="flex items-start justify-center leading-none">
              <span className="text-[4.5rem] leading-[0.9] font-semibold">
                New
              </span>
              <div className="flex flex-col items-start mt-2 ml-2">
                <span className="text-2xl italic font-light">Drops</span>
                <span className="text-xs uppercase tracking-[0.3em] mt-1 font-light">
                  & private edits
                </span>
              </div>
            </div>
          </div>

          {/* Body copy */}
          <p className="text-sm font-medium text-primary/80 max-w-[280px] mx-auto mb-8 leading-relaxed">
            Join our inner circle for early access to collections, private
            offers and styling stories from Delan.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mx-2">
            <div
              className="
                group relative w-full flex items-center gap-3
                bg-white border border-[#642c44]/20
                shadow-sm px-4 py-3 
                hover:border-[#642c44]/50 transition-all duration-300
              "
            >
              <span className="text-[10px] text-[#642c44]/50 uppercase tracking-widest font-bold whitespace-nowrap">
                Newsletter
              </span>

              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="
                  flex-1 bg-transparent outline-none 
                  text-xs text-[#4A1F33]/80 placeholder:text-[#4A1F33]/40
                  tracking-wide
                "
                autoComplete="email"
                disabled={isDisabled}
              />
            </div>

            <button
              type="submit"
              disabled={isDisabled}
              className="
                mt-4 w-full py-4 px-6 
                bg-primary text-white
                uppercase text-xs font-bold tracking-[0.25em]
                transition-all duration-300
                shadow-[0_10px_30px_-10px_rgba(28,36,66,0.4)]
                hover:bg-primary/90
                active:scale-[0.99]
                disabled:opacity-60 disabled:cursor-not-allowed
              "
            >
              {loading
                ? "Subscribing…"
                : submitted
                  ? "Subscribed"
                  : "Subscribe"}
            </button>
          </form>

          {/* Status */}
          <div
            className="mt-3 min-h-[1.25rem]"
            role="status"
            aria-live="polite"
          >
            {status.msg && (
              <p
                className={`text-xs ${status.ok ? "text-green-700" : "text-red-700"
                  }`}
              >
                {status.msg}
              </p>
            )}
          </div>

          <p className="mt-4 text-[9px] text-primary/40 uppercase tracking-widest">
            No spam, only considered edits.
          </p>
        </div>
      </div>
    </div>
  );
}

export default NewsletterPopup;
