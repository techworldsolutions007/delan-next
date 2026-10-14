'use client';
// import React, { useEffect, useState } from "react";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// const EmbeddedAffiliateSignup = () => {
//   const [loaded, setLoaded] = useState(false);

//   useEffect(() => {
//     // Load GoAffPro's embed script (resizes iframe, etc.)
//     const s = document.createElement("script");
//     s.src = "https://static.goaffpro.com/embed.js";
//     s.async = true;
//     s.onload = () => setLoaded(true);
//     document.body.appendChild(s);
//     return () => { document.body.removeChild(s); };
//   }, []);

//   return (
//     <Card className="w-full mt-8">
//       <CardHeader>
//         <CardTitle className="text-2xl text-center">Application Form</CardTitle>
//         <CardDescription className="text-center">
//           Fill out the official signup form below.
//         </CardDescription>
//       </CardHeader>
//       <CardContent>
//         <div className="relative">
//           {!loaded && (
//             <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
//               Loading signup…
//             </div>
//           )}
//           <iframe
//             // Replace with your portal’s signup URL
//             src="https://delan1.goaffpro.com/create-account"
//             id="affiliate_page"
//             title="Affiliate Signup"
//             className="w-full h-[1000px] rounded-xl border border-gray-200"
//           />
//         </div>
//       </CardContent>
//     </Card>
//   );
// };

// export default function AffiliatePage() {
//   const [showForm, setShowForm] = useState(false);

//   return (
//     <div className="min-h-screen flex flex-col items-center bg-white px-4 pt-16 md:pt-24 pb-16">
//       <h1 className="cormorant-garamond-700 text-primary text-3xl md:text-4xl lg:text-5xl uppercase mb-4 text-center">
//         Join Our Affiliate Program
//       </h1>
//       <p className="montserrat-500 text-gray-600 text-center max-w-2xl mb-12">
//         Partner with us and earn commissions by promoting our products to your audience.
//       </p>

//       <div className="w-full max-w-4xl montserrat-500">
//         <div className="rounded-xl bg-gray-50 border border-gray-100 p-8 md:p-12 shadow-sm">
//           <h2 className="text-2xl font-semibold text-primary/90 text-center mb-8">
//             How It Works
//           </h2>
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
//             <div><h3 className="text-xl font-semibold mb-2">1. Sign Up</h3><p>Open the form.</p></div>
//             <div><h3 className="text-xl font-semibold mb-2">2. Promote</h3><p>Share your link.</p></div>
//             <div><h3 className="text-xl font-semibold mb-2">3. Earn</h3><p>Get commissions.</p></div>
//           </div>
//         </div>

//         <div className="mt-12 flex flex-col items-center">
//           {!showForm ? (
//             <Button onClick={() => setShowForm(true)} className="h-14 px-12 text-lg">
//               Start Your Journey
//             </Button>
//           ) : (
//             <EmbeddedAffiliateSignup />
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// // src/pages/Affiliate.jsx
// import React from "react";

// const Affiliate = () => {
//   // ✅ Match About.jsx typography
//   const headingStyle = "text-2xl font-semibold text-primary/90 mt-10 mb-4";
//   const paragraphStyle = "text-gray-700 mb-4 leading-relaxed text-justify";

//   const APPLY_URL = "https://delan.in/affiliate-program";

//   return (
//     <div className="bg-white min-h-screen">
//       <div className="max-w-5xl mx-auto px-4 py-10">
//         {/* HERO */}
//         <div className="rounded-2xl border border-border bg-white shadow-sm p-6 md:p-10">
//           <h1 className="text-3xl md:text-4xl font-semibold text-primary/90">
//             DELAN Affiliate Program
//           </h1>
//           <p className="text-sm text-gray-500 mt-2">
//             Last updated: 8 January 2026
//           </p>

//           <p className={`${paragraphStyle} mt-6 mb-0`}>
//             Partner with <strong>DELAN</strong> and earn commissions by sharing
//             premium, modern womenswear with your audience—made for comfort,
//             confidence, and the moments that matter.
//           </p>

//           <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center">
//             <a
//               href={APPLY_URL}
//               className="inline-flex items-center justify-center rounded-xl px-5 py-3 font-medium bg-primary text-primary-foreground hover:opacity-95 transition"
//             >
//               Apply Now
//             </a>
//             <a href={APPLY_URL} className="text-sm underline text-primary/90">
//               delan.in/affiliate-program
//             </a>
//           </div>

//           {/* Quick highlights (keep minimal) */}
//           <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
//             <div className="rounded-xl border border-border p-4">
//               <p className="text-xs text-gray-500">Commission</p>
//               <p className="text-lg font-semibold text-primary/90 mt-1">__%</p>
//             </div>
//             <div className="rounded-xl border border-border p-4">
//               <p className="text-xs text-gray-500">Cookie Duration</p>
//               <p className="text-lg font-semibold text-primary/90 mt-1">
//                 __ days
//               </p>
//             </div>
//             <div className="rounded-xl border border-border p-4">
//               <p className="text-xs text-gray-500">Payout</p>
//               <p className="text-lg font-semibold text-primary/90 mt-1">
//                 Net __ days
//               </p>
//             </div>
//           </div>
//         </div>

//         {/* WHY */}
//         <h2 className={headingStyle}>Why DELAN?</h2>
//         <div className="rounded-2xl border border-border bg-white shadow-sm p-6">
//           <p className={`${paragraphStyle} mb-0`}>
//             DELAN is designed for elevated everyday dressing—clean silhouettes,
//             premium feel, and effortless styling. If your audience loves modern,
//             polished looks, DELAN fits naturally into their wardrobe.
//           </p>
//         </div>

//         {/* BENEFITS */}
//         <h2 className={headingStyle}>What you get</h2>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <div className="rounded-2xl border border-border bg-white shadow-sm p-6">
//             <p className="font-semibold text-primary/90">
//               Earnings on every confirmed sale
//             </p>
//             <p className="text-gray-700 mt-2 leading-relaxed">
//               Earn commission on eligible orders you refer. Replace:{" "}
//               <strong>__%</strong>
//             </p>
//           </div>
//           <div className="rounded-2xl border border-border bg-white shadow-sm p-6">
//             <p className="font-semibold text-primary/90">Tracking that works</p>
//             <p className="text-gray-700 mt-2 leading-relaxed">
//               Cookie window: <strong>__ days</strong> so you get credit within
//               the tracking period.
//             </p>
//           </div>
//           <div className="rounded-2xl border border-border bg-white shadow-sm p-6">
//             <p className="font-semibold text-primary/90">Premium creatives</p>
//             <p className="text-gray-700 mt-2 leading-relaxed">
//               Access product images, banners, and launch assets that match
//               DELAN’s look.
//             </p>
//           </div>
//           <div className="rounded-2xl border border-border bg-white shadow-sm p-6">
//             <p className="font-semibold text-primary/90">Quick support</p>
//             <p className="text-gray-700 mt-2 leading-relaxed">
//               Help with links, tracking, and campaign assets when you need it.
//             </p>
//           </div>
//         </div>

//         {/* HOW IT WORKS */}
//         <h2 className={headingStyle}>How to start</h2>
//         <div className="rounded-2xl border border-border bg-white shadow-sm p-6">
//           <ol className="space-y-3 text-gray-700">
//             <li className="flex gap-3">
//               <span className="mt-[2px] inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-sm font-semibold text-primary/90">
//                 1
//               </span>
//               <span>
//                 Apply here:{" "}
//                 <a href={APPLY_URL} className="underline text-primary/90">
//                   delan.in/affiliate-program
//                 </a>
//               </span>
//             </li>
//             <li className="flex gap-3">
//               <span className="mt-[2px] inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-sm font-semibold text-primary/90">
//                 2
//               </span>
//               <span>Get approved and receive your tracking links.</span>
//             </li>
//             <li className="flex gap-3">
//               <span className="mt-[2px] inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-sm font-semibold text-primary/90">
//                 3
//               </span>
//               <span>Share DELAN and earn on confirmed orders.</span>
//             </li>
//           </ol>
//         </div>

//         {/* SUPPORT */}
//         <h2 className={headingStyle}>Support</h2>
//         <div className="rounded-2xl border border-border bg-white shadow-sm p-6">
//           <p className={paragraphStyle}>
//             For affiliate support, tracking queries, or creative requests:
//           </p>

//           <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
//             <a
//               href="mailto:support@delan.in"
//               className="rounded-xl border border-border p-4 hover:bg-muted/40 transition"
//             >
//               <p className="text-xs text-gray-500">Email</p>
//               <p className="font-semibold text-primary/90 mt-1">
//                 support@delan.in
//               </p>
//             </a>

//             <a
//               href="tel:+919310329849"
//               className="rounded-xl border border-border p-4 hover:bg-muted/40 transition"
//             >
//               <p className="text-xs text-gray-500">Phone</p>
//               <p className="font-semibold text-primary/90 mt-1">
//                 +91 93103 29849
//               </p>
//             </a>
//           </div>

//           <div className="mt-6">
//             <a
//               href={APPLY_URL}
//               className="inline-flex items-center justify-center rounded-xl px-5 py-3 font-medium bg-primary text-primary-foreground hover:opacity-95 transition"
//             >
//               Apply Now
//             </a>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Affiliate;

// src/pages/Affiliate.jsx
import React from "react";

const Affiliate = () => {
  // ✅ Match About.jsx typography
  const headingStyle = "text-2xl font-semibold text-primary/90 mt-10 mb-4";
  const paragraphStyle = "text-gray-700 mb-4 leading-relaxed text-justify";

  const APPLY_URL = "https://delan.in/affiliate-program";

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* HERO */}
        <div className="rounded-2xl border border-border bg-white shadow-sm p-6 md:p-10">
          <h1 className="cormorant-garamond-700 text-primary text-3xl md:text-4xl lg:text-5xl uppercase">
            Earn with Delan — Women&apos;s Fashion Affiliate Program India
          </h1>

          <p className={`${paragraphStyle} mt-6 mb-0`}>
            Join DELAN’s Affiliate Program and earn by sharing premium, modern
            womenswear with your audience. If you create fashion content, style
            edits, or curated recommendations, this program is a simple way to
            monetize your influence while introducing your community to pieces
            they’ll genuinely love wearing.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center">
            <a
              href={APPLY_URL}
              className="inline-flex items-center justify-center rounded-xl px-5 py-3 font-medium bg-primary text-primary-foreground hover:opacity-95 transition"
            >
              Apply Now
            </a>
            {/* <a href={APPLY_URL} className="text-sm underline text-primary/90">
              delan.in/affiliate-program
            </a> */}
          </div>
        </div>

        {/* WHY */}
        <h2 className={headingStyle}>Why partner with DELAN?</h2>
        <div className="rounded-2xl border border-border bg-white shadow-sm p-6">
          <p className={`${paragraphStyle} mb-0`}>
            DELAN is designed for elevated everyday dressing—clean silhouettes,
            premium feel, and effortless styling. When you recommend DELAN,
            you’re sharing a brand that blends comfort with a polished look,
            making it an easy fit for a modern wardrobe.
          </p>
        </div>

        {/* BENEFITS */}
        <h2 className={headingStyle}>What you get</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border bg-white shadow-sm p-6">
            <p className="font-semibold text-primary/90">
              Commission on eligible sales
            </p>
            <p className="text-gray-700 mt-2 leading-relaxed">
              Earn when your audience shops through your affiliate links, based
              on approved orders under program terms.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-white shadow-sm p-6">
            <p className="font-semibold text-primary/90">Reliable tracking</p>
            <p className="text-gray-700 mt-2 leading-relaxed">
              Your affiliate links help track referrals so you get credit for
              eligible purchases within the program’s tracking window.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-white shadow-sm p-6">
            <p className="font-semibold text-primary/90">Premium creatives</p>
            <p className="text-gray-700 mt-2 leading-relaxed">
              Access product images and campaign assets that match DELAN’s
              aesthetic.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-white shadow-sm p-6">
            <p className="font-semibold text-primary/90">Quick support</p>
            <p className="text-gray-700 mt-2 leading-relaxed">
              Need help with links, tracking, or creative requests? Our team is
              here.
            </p>
          </div>
        </div>

        {/* HOW IT WORKS */}
        <h2 className={headingStyle}>How to start</h2>
        <div className="rounded-2xl border border-border bg-white shadow-sm p-6">
          <ol className="space-y-3 text-gray-700">
            <li className="flex gap-3">
              <span className="mt-[2px] inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-sm font-semibold text-primary/90">
                1
              </span>
              <span>
                Apply here:{" "}
                <a href={APPLY_URL} className="underline text-primary/90">
                  delan.in/affiliate-program
                </a>
              </span>
            </li>

            <li className="flex gap-3">
              <span className="mt-[2px] inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-sm font-semibold text-primary/90">
                2
              </span>
              <span>
                Once approved, you’ll receive your affiliate access and tracking
                links.
              </span>
            </li>

            <li className="flex gap-3">
              <span className="mt-[2px] inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-sm font-semibold text-primary/90">
                3
              </span>
              <span>
                Share DELAN with your audience and earn on eligible confirmed
                orders.
              </span>
            </li>
          </ol>
        </div>

        {/* GUIDELINES (MINIMAL + PROFESSIONAL) */}
        <h2 className={headingStyle}>Program guidelines</h2>
        <div className="rounded-2xl border border-border bg-white shadow-sm p-6">
          <p className={paragraphStyle}>
            To keep the program fair and brand-safe, affiliates should share
            accurate product information and use approved creatives where
            applicable. Misleading claims, spammy promotion, or unauthorized
            discount messaging may lead to removal from the program.
          </p>
          <p className={`${paragraphStyle} mb-0`}>
            All tracking, approvals, and payouts are governed by the affiliate
            program’s terms and validation process.
          </p>
        </div>

        {/* SUPPORT */}
        <h2 className={headingStyle}>Support</h2>
        <div className="rounded-2xl border border-border bg-white shadow-sm p-6">
          <p className={paragraphStyle}>
            For affiliate support, tracking queries, or creative requests:
          </p>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href="mailto:support@delanonline.com"
              className="rounded-xl border border-border p-4 hover:bg-muted/40 transition"
            >
              <p className="text-xs text-gray-500">Email</p>
              <p className="font-semibold text-primary/90 mt-1">
                support@delanonline.com
              </p>
            </a>

            <a
              href="tel:+919310329849"
              className="rounded-xl border border-border p-4 hover:bg-muted/40 transition"
            >
              <p className="text-xs text-gray-500">Phone</p>
              <p className="font-semibold text-primary/90 mt-1">
                +91 93103 29849
              </p>
            </a>
          </div>

          <div className="mt-6">
            <a
              href={APPLY_URL}
              className="inline-flex items-center justify-center rounded-xl px-5 py-3 font-medium bg-primary text-primary-foreground hover:opacity-95 transition"
            >
              Apply Now
            </a>
          </div>
        </div>

        {/* FAQ (SHORT) */}
        <h2 className={headingStyle}>FAQ</h2>
        <div className="rounded-2xl border border-border bg-white shadow-sm p-6">
          <p className={paragraphStyle}>
            <strong>Who can apply?</strong>
            <br />
            Creators, stylists, bloggers, and publishers with an audience
            aligned with women’s fashion and lifestyle.
          </p>

          <p className={paragraphStyle}>
            <strong>When do I start earning?</strong>
            <br />
            After approval, you can share your affiliate links right away.
            Earnings apply to eligible confirmed orders as per program
            validation.
          </p>

          <p className={`${paragraphStyle} mb-0`}>
            <strong>How do I apply?</strong>
            <br />
            Apply using{" "}
            <a href={APPLY_URL} className="underline text-primary/90">
              delan.in/affiliate-program
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

export default Affiliate;
