'use client';
// src/components/Footer.jsx
import React, { useState } from "react";
import Link from 'next/link';
import { shopify } from "@/lib/shopify";

function IgIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="1em" height="1em" fill="currentColor" aria-hidden="true">
      <path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"/>
    </svg>
  );
}
function FbIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" width="1em" height="1em" fill="currentColor" aria-hidden="true">
      <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z"/>
    </svg>
  );
}
function PinIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512" width="1em" height="1em" fill="currentColor" aria-hidden="true">
      <path d="M496 256c0 137-111 248-248 248-25.6 0-50.2-3.9-73.4-11.1 10.1-16.5 25.2-43.5 30.8-65 3-11.6 15.4-59 15.4-59 8.1 15.4 31.7 28.5 56.8 28.5 74.8 0 128.7-68.8 128.7-154.3 0-81.9-66.9-143.2-152.9-143.2-107 0-163.9 71.8-163.9 150.1 0 36.4 19.4 81.7 50.3 96.1 4.7 2.2 7.2 1.2 8.3-3.3.8-3.4 5-20.3 6.9-28.1.6-2.5.3-4.7-1.7-7.1-10.1-12.5-18.3-35.3-18.3-56.6 0-54.7 41.4-107.6 112-107.6 60.9 0 103.6 41.5 103.6 100.9 0 67.1-33.9 113.6-78 113.6-24.3 0-42.6-20.1-36.7-44.8 7-29.5 20.5-61.3 20.5-82.6 0-19-10.2-34.9-31.4-34.9-24.9 0-44.9 25.7-44.9 60.2 0 22 7.4 36.8 7.4 36.8s-24.5 103.8-29 123.2c-5 21.4-3 51.6-.9 71.2C65.4 450.9 0 361.1 0 256 0 119 111 8 248 8s248 111 248 248z"/>
    </svg>
  );
}
function YtIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" width="1em" height="1em" fill="currentColor" aria-hidden="true">
      <path d="M549.655 124.083c-6.281-23.65-24.787-42.276-48.284-48.597C458.781 64 288 64 288 64S117.22 64 74.629 75.486c-23.497 6.322-42.003 24.947-48.284 48.597-11.412 42.867-11.412 132.305-11.412 132.305s0 89.438 11.412 132.305c6.281 23.65 24.787 41.5 48.284 47.821C117.22 448 288 448 288 448s170.78 0 213.371-11.486c23.497-6.321 42.003-24.171 48.284-47.821 11.412-42.867 11.412-132.305 11.412-132.305s0-89.438-11.412-132.305zm-317.51 213.508V175.185l142.739 81.205-142.739 81.201z"/>
    </svg>
  );
}
import { NEWSLETTER_SIGNUP } from "@/lib/queries";

const american = "/logos/american.svg";
const paytm = "/logos/paytm.svg";
const mastercard = "/logos/mastercard.svg";
const visa = "/logos/visa.svg";


const Footer = () => {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ ok: false, msg: "" });
  const [hp, setHp] = useState("");

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

  const onSubmit = async (e) => {
    e.preventDefault();
    if (hp) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail)
      return setStatus({ ok: false, msg: "Please enter your email." });
    if (!consent) {
      return setStatus({
        ok: false,
        msg: "Please agree to receive marketing emails.",
      });
    }

    setLoading(true);
    setStatus({ ok: false, msg: "" });

    try {
      const password = makeRandomPassword();
      const data = await shopify(NEWSLETTER_SIGNUP, {
        email: trimmedEmail,
        acceptsMarketing: true,
        password,
      });

      const errs =
        data?.customerCreate?.customerUserErrors ||
        data?.customerCreate?.userErrors ||
        [];
      if (errs.length) throw new Error(errs.map((e) => e.message).join(", "));

      setStatus({
        ok: true,
        msg: "Thanks! Please check your email to confirm your subscription.",
      });
      setEmail("");
      setConsent(false);
    } catch (err) {
      setStatus({
        ok: false,
        msg: err.message || "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="bg-[#eee5ea] text-[#642c44]" id="footer">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-10 items-start">
        {/* Customer Service */}
        <div className="md:col-span-3">
          <h4 className="text-lg montserrat-600 mb-4 tracking-[0.025em] leading-snug">Customer Service</h4>
          <ul className="space-y-2 montserrat-500 tracking-[0.025em] leading-snug ">
            <li>
              <Link href="/contact" className="hover:text-[#642c44]/60">
                Contact
              </Link>
            </li>
            <li>
              <Link href="/returns-exchange" className="hover:text-[#642c44]/60">
                Return/Exchange
              </Link>
            </li>
            <li>
              <Link href="/privacy-policy" className="hover:text-[#642c44]/60">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/shipping-policy" className="hover:text-[#642c44]/60">
                Shipping Policy
              </Link>
            </li>
            <li>
              <Link href="/fabric-care" className="hover:text-[#642c44]/60">
                Fabric Care
              </Link>
            </li>
            <li>
              <Link href="/terms-conditions" className="hover:text-[#642c44]/60">
                Terms & Conditions
              </Link>
            </li>
            <li>
              <Link href="/faq" className="hover:text-[#642c44]/60">
                FAQ
              </Link>
            </li>
          </ul>
        </div>

        {/* Company + Secure Payment */}
        <div className="md:col-span-3">
          <h4 className="text-lg montserrat-600 mb-4 tracking-[0.025em] leading-snug">Company</h4>
          <ul className="space-y-2 montserrat-500 mb-6 tracking-[0.025em] leading-snug">
            <li>
              <Link href="/why-delan" className="hover:text-[#642c44]/60">
                Why Delan
              </Link>
            </li>
            <li>
              <Link href="/about-us" className="hover:text-[#642c44]/60">
                About Us
              </Link>
            </li>
            <li>
              <Link href="/affiliate-program" className="hover:text-[#642c44]/60">
                Affiliate Marketing
              </Link>
            </li>
            <li>
              <Link href="/blogs/news" className="hover:text-[#642c44]/60">
                Blog
              </Link>
            </li>
          </ul>

          <h5 className="text-lg montserrat-600 mb-2 tracking-[0.025em] leading-snug">Secure Payment</h5>
          <div className="flex items-center gap-4 flex-wrap">
            <img
              src={visa}
              alt="Visa"
              className="h-6 w-auto object-contain"
              loading="lazy"
            />
            <img
              src={paytm}
              alt="Paytm"
              className="h-3.5 w-auto object-contain"
              loading="lazy"
            />
            <img
              src={mastercard}
              alt="Mastercard"
              className="h-6 w-auto object-contain"
              loading="lazy"
            />
            <img
              src={american}
              alt="American Express"
              className="h-6 w-auto object-contain"
              loading="lazy"
            />
          </div>
        </div>

        {/* Social + Address */}
        <div className="md:col-span-3">
          <h4 className="text-lg montserrat-600 mb-4">Follow Us</h4>
          <div className="flex space-x-4 text-2xl mb-5">
            <a href="https://www.instagram.com/delan.in/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-pink-500">
              <IgIcon />
            </a>
            <a href="https://www.facebook.com/delanonlinestore" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:text-blue-600">
              <FbIcon />
            </a>
            <a href="https://www.pinterest.com/delanfashion" target="_blank" rel="noopener noreferrer" aria-label="Pinterest" className="hover:text-red-600">
              <PinIcon />
            </a>
            <a href="https://www.youtube.com/@delan-in" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="hover:text-red-500">
              <YtIcon />
            </a>
          </div>

          <address className="not-italic text-sm leading-relaxed montserrat-500 tracking-[0.025em] leading-snug">
            <span className="block text-lg montserrat-600 mb-2 tracking-[0.025em] leading-snug">
              Office Address
            </span>
            Shop No. 3, Sco-17, <br />
            HUDA Staff Colony, Sector 16, Faridabad, Haryana 121002
          </address>
        </div>

        {/* Newsletter — RIGHT side */}
        <div className="md:col-span-3 md:order-last">
          <form onSubmit={onSubmit} aria-labelledby="nl-title">
            {/* Honeypot */}
            <input
              type="text"
              name="website"
              value={hp}
              onChange={(e) => setHp(e.target.value)}
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />

            <h3 id="nl-title" className="text-lg montserrat-600 mb-2 tracking-[0.025em] leading-snug">
              Join Our Newsletter
            </h3>
            <p className="text-[13px] montserrat-500 text-[#642c44]/70 mb-4 tracking-[0.025em] leading-snugs">
              Get drops, tips & members-only offers. No spam.
            </p>

            {/* Email row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                id="newsletter-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. name@example.com"
                className="w-full h-12 rounded-lg border border-[#642c44]/30 bg-white px-3 text-sm text-[#642c44] outline-none focus:ring-0 placeholder:text-[#642c44]/50"
                autoComplete="email"
              />
              <button
                type="submit"
                disabled={loading}
                className="h-12 rounded-lg bg-[#642c44] px-5 text-white text-sm font-semibold hover:bg-[#642c44]/90 disabled:opacity-60"
              >
                {loading ? "Subscribing…" : "Subscribe"}
              </button>
            </div>

            {/* Consents */}
            <div
              className="mt-4 space-y-3"
              role="group"
              aria-label="Email consent"
            >
              <label className="flex items-start gap-2">
                <input
                  id="consent"
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                <span className="text-xs text-[#642c44]/80 montserrat-500 leading-snug tracking-[0.025em]">
                  I agree to receive marketing emails from Delan. Read our{" "}
                  <a
                    href="/privacy-policy"
                    className="underline underline-offset-2"
                  >
                    Privacy Policy
                  </a>
                  .
                </span>
              </label>
            </div>

            {/* Status */}
            <div
              className="mt-2 min-h-[1.25rem]"
              role="status"
              aria-live="polite"
            >
              {status.msg && (
                <p
                  className={`${status.ok ? "text-green-700" : "text-red-700"} text-xs`}
                >
                  {status.msg}
                </p>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-[#eee5ea] border-t border-[#642c44]/20">
        <div
          className="max-w-7xl mx-auto px-6 py-4 text-sm montserrat-500
                  flex flex-col items-center gap-2 md:flex-row md:justify-between"
        >
          <span>
            &copy; {new Date().getFullYear()}{" "}
            <span className="font-semibold tracking-[0.025em]">Delan</span>. All Rights Reserved.
          </span>

          <p target="_blank" rel="noopener noreferrer" className=" ">
            Delan by{" "}
            <span className="font-semibold hover:underline tracking-[0.025em]">StylishIcon</span>.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
