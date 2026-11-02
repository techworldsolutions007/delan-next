'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaInstagram, FaFacebook, FaPinterest, FaYoutube } from 'react-icons/fa';

import FooterHero from './FooterHero';
import { shopify } from '@/lib/shopify';
import { NEWSLETTER_SIGNUP } from '@/lib/queries';

export default function Footer() {
  const [email, setEmail]     = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState({ ok: false, msg: '' });
  const [hp, setHp]           = useState('');

  const makeRandomPassword = () => {
    try {
      const arr = new Uint32Array(3);
      crypto.getRandomValues(arr);
      return Array.from(arr).map(n => n.toString(36)).join('-');
    } catch {
      return Math.random().toString(36).slice(2) + '-' + Date.now();
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (hp) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return setStatus({ ok: false, msg: 'Please enter your email.' });
    if (!consent) return setStatus({ ok: false, msg: 'Please agree to receive marketing emails.' });

    setLoading(true);
    setStatus({ ok: false, msg: '' });

    try {
      const password = makeRandomPassword();
      const data = await shopify(NEWSLETTER_SIGNUP, { email: trimmedEmail, acceptsMarketing: true, password });
      const errs = data?.customerCreate?.customerUserErrors || data?.customerCreate?.userErrors || [];
      if (errs.length) throw new Error(errs.map(e => e.message).join(', '));

      setStatus({ ok: true, msg: 'Thanks! Please check your email to confirm your subscription.' });
      setEmail('');
      setConsent(false);
    } catch (err) {
      setStatus({ ok: false, msg: err.message || 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="bg-accent text-[#642c44]" id="footer">

      {/* DelanShiny: logo + animated tagline */}
       <FooterHero /> 

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-10 items-start">

        {/* Customer Service */}
        <div className="md:col-span-3">
          <h4 className="text-lg montserrat-600 mb-4 tracking-[0.025em] leading-snug">Customer Service</h4>
          <ul className="space-y-2 montserrat-500 tracking-[0.025em] leading-snug">
            <li><Link href="/contact"          className="hover:text-[#642c44]/60">Contact</Link></li>
            <li><Link href="/returns-exchange" className="hover:text-[#642c44]/60">Return/Exchange</Link></li>
            <li><Link href="/privacy-policy"   className="hover:text-[#642c44]/60">Privacy Policy</Link></li>
            <li><Link href="/shipping-policy"  className="hover:text-[#642c44]/60">Shipping Policy</Link></li>
            <li><Link href="/fabric-care"      className="hover:text-[#642c44]/60">Fabric Care</Link></li>
            <li><Link href="/terms-conditions" className="hover:text-[#642c44]/60">Terms &amp; Conditions</Link></li>
            <li><Link href="/faq"              className="hover:text-[#642c44]/60">FAQ</Link></li>
          </ul>
        </div>

        {/* Company + Secure Payment */}
        <div className="md:col-span-3">
          <h4 className="text-lg montserrat-600 mb-4 tracking-[0.025em] leading-snug">Company</h4>
          <ul className="space-y-2 montserrat-500 mb-6 tracking-[0.025em] leading-snug">
            <li><Link href="/why-delan"           className="hover:text-[#642c44]/60">Why Delan</Link></li>
            <li><Link href="/about-us"            className="hover:text-[#642c44]/60">About Us</Link></li>
            <li><Link href="/affiliate-marketing" className="hover:text-[#642c44]/60">Affiliate Marketing</Link></li>
            <li><Link href="/blogs/news"          className="hover:text-[#642c44]/60">Blog</Link></li>
          </ul>

          <h5 className="text-lg montserrat-600 mb-2 tracking-[0.025em] leading-snug">Secure Payment</h5>
          <div className="flex items-center gap-4 flex-wrap">
            <Image src="/images/visa.svg"       alt="Visa"             width={48} height={24} className="h-6 w-auto object-contain" />
            <Image src="/images/paytm.svg"      alt="Paytm"            width={56} height={14} className="h-3.5 w-auto object-contain" />
            <Image src="/images/mastercard.svg" alt="Mastercard"       width={48} height={24} className="h-6 w-auto object-contain" />
            <Image src="/images/american.svg"   alt="American Express" width={48} height={24} className="h-6 w-auto object-contain" />
          </div>
        </div>

        {/* Follow Us + Address */}
        <div className="md:col-span-3">
          <h4 className="text-lg montserrat-600 mb-3 tracking-[0.025em] leading-snug">Follow Us</h4>
          <div className="flex space-x-4 text-2xl mb-6">
            <a href="https://www.instagram.com/delan.in/"          target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-pink-500"><FaInstagram /></a>
            <a href="https://www.facebook.com/delanonlinestore"    target="_blank" rel="noopener noreferrer" aria-label="Facebook"  className="hover:text-blue-600"><FaFacebook /></a>
            <a href="https://www.pinterest.com/delanfashion"       target="_blank" rel="noopener noreferrer" aria-label="Pinterest" className="hover:text-red-600"><FaPinterest /></a>
            <a href="https://www.youtube.com/@delan-in"            target="_blank" rel="noopener noreferrer" aria-label="YouTube"   className="hover:text-red-500"><FaYoutube /></a>
          </div>
          <address className="not-italic text-sm leading-relaxed montserrat-500 tracking-[0.025em]">
            <span className="block text-lg montserrat-600 mb-2 tracking-[0.025em] leading-snug">Office Address</span>
            Shop No. 3, Sco-17,<br />
            HUDA Staff Colony, Sector 16,<br />
            Faridabad, Haryana 121002
          </address>
        </div>

        {/* Newsletter */}
        <div className="md:col-span-3 md:order-last">
          <form onSubmit={onSubmit} aria-labelledby="nl-title" noValidate>
            <input type="text" name="website" value={hp} onChange={e => setHp(e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <h3 id="nl-title" className="text-lg montserrat-600 mb-2 tracking-[0.025em] leading-snug">Join Our Newsletter</h3>
            <p className="text-[13px] montserrat-500 text-[#642c44]/70 mb-4 tracking-[0.025em] leading-snug">
              Get drops, tips &amp; members-only offers. No spam.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <label htmlFor="newsletter-email" className="sr-only">Email address</label>
              <input
                id="newsletter-email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. name@example.com"
                className="w-full h-12 rounded-lg border border-[#642c44]/30 bg-white px-3 text-sm text-[#642c44] outline-none focus:ring-0 placeholder:text-[#642c44]/50"
                autoComplete="email"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="h-12 rounded-lg bg-[#642c44] px-5 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 whitespace-nowrap"
              >
                {loading ? 'Subscribing…' : 'Subscribe'}
              </button>
            </div>
            <div className="mt-4 space-y-3" role="group" aria-label="Email consent">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  id="consent"
                  type="checkbox"
                  checked={consent}
                  onChange={e => setConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#642c44]"
                />
                <span className="text-xs text-[#642c44]/80 montserrat-500 leading-snug tracking-[0.025em]">
                  I agree to receive marketing emails from Delan. Read our{' '}
                  <Link href="/privacy-policy" className="underline underline-offset-2">Privacy Policy</Link>.
                </span>
              </label>
            </div>
            <div className="mt-2 min-h-[1.25rem]" role="status" aria-live="polite">
              {status.msg && (
                <p className={`${status.ok ? 'text-green-700' : 'text-red-700'} text-xs`}>{status.msg}</p>
              )}
            </div>
          </form>
        </div>

      </div>

      {/* Bottom Bar */}
      <div className="border-t border-[#642c44]/20">
        <div className="max-w-7xl mx-auto px-6 py-4 text-sm montserrat-500 flex flex-col items-center gap-2 md:flex-row md:justify-between">
          <span>&copy; {new Date().getFullYear()} <span className="font-semibold tracking-[0.025em]">Delan</span>. All Rights Reserved.</span>
          <p>Delan by <span className="font-semibold hover:underline tracking-[0.025em]">StylishIcon</span>.</p>
        </div>
      </div>

    </footer>
  );
}
