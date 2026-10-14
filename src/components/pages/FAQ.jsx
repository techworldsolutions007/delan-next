'use client';
import React from 'react';

/**
 * FAQ Component
 * Displays frequently asked questions, styled to match other static pages.
 */
const FAQ = () => {
  // Custom classes for styling content elements consistently
  const questionStyle = "text-xl font-semibold text-primary/90 mt-8 mb-3";
  const answerStyle = "text-gray-700 mb-4 leading-relaxed";
  const linkStyle = "text-primary hover:underline";

  return (
    <div className="min-h-screen flex flex-col items-center bg-white px-4 pt-16 md:pt-24 pb-16">
      {/* Page Title */}
      <h1 className="cormorant-garamond-700 text-primary text-3xl md:text-4xl lg:text-5xl uppercase mb-4 text-center">
        Frequently Asked Questions
      </h1>
      <p className="montserrat-500 text-gray-500 text-center mb-8 max-w-xl text-sm md:text-base">
        Shipping, returns, payments, COD &amp; more — answered.
      </p>

      {/* Content Container */}
      <div className="w-full max-w-4xl montserrat-500">
        <div className="rounded-xl p-8 md:p-12">
          {/* FAQ Content */}

          <h2 className="text-lg font-bold text-primary/80 uppercase tracking-[0.12em] mt-0 mb-6 border-b border-primary/10 pb-2">
            Orders &amp; Payments
          </h2>

          <h3 className={questionStyle}>1. What payment methods do you accept?</h3>
          <p className={answerStyle}>
            We accept all major credit cards, debit cards, UPI, net banking, and popular digital wallets through our secure payment gateway. Cash on Delivery (COD) is also available on eligible orders.
          </p>

          <h2 className="text-lg font-bold text-primary/80 uppercase tracking-[0.12em] mt-10 mb-6 border-b border-primary/10 pb-2">
            Shipping &amp; Delivery
          </h2>

          <h3 className={questionStyle}>2. How long does shipping take?</h3>
          <p className={answerStyle}>
            Standard shipping typically takes 10–12 business days for most locations within India. Express orders from our Ready to Ship collection may arrive sooner. You can find more detailed information on our{' '}
            <a href="/shipping-policy" className={linkStyle}>Shipping Policy</a> page.
          </p>

          <h3 className={questionStyle}>3. Do you ship internationally?</h3>
          <p className={answerStyle}>
            Currently, we only ship within India. We are working on expanding our services to international locations in the near future.
          </p>

          <h3 className={questionStyle}>4. How can I track my order?</h3>
          <p className={answerStyle}>
            Once your order is shipped, you will receive an email and SMS with a tracking number and a link to the courier&apos;s website. You can also use the{' '}
            <a href="/track-order" className={linkStyle}>Track Order</a> feature on our website.
          </p>

          <h2 className="text-lg font-bold text-primary/80 uppercase tracking-[0.12em] mt-10 mb-6 border-b border-primary/10 pb-2">
            Returns &amp; Exchanges
          </h2>

          <h3 className={questionStyle}>5. What is your return and exchange policy?</h3>
          <p className={answerStyle}>
            We offer a 7-day return policy for refunds and a 7-day exchange policy for size or colour changes from the date of delivery. Items must be unused, unwashed, and in original packaging with tags intact. For complete details and eligibility conditions, please visit our{' '}
            <a href="/returns-exchange" className={linkStyle}>Returns &amp; Exchanges</a> page.
          </p>

          <h2 className="text-lg font-bold text-primary/80 uppercase tracking-[0.12em] mt-10 mb-6 border-b border-primary/10 pb-2">
            Customer Support
          </h2>

          <h3 className={questionStyle}>6. How do I contact customer support?</h3>
          <p className={answerStyle}>
            You can reach our customer support team by emailing us at{' '}
            <a href="mailto:support@delanonline.com" className={linkStyle}>support@delanonline.com</a>{' '}
            or by calling us at{' '}
            <a href="tel:+919310329849" className={linkStyle}>+91 93103 29849</a>.
            Our team is available Monday–Saturday, 10 AM–6 PM IST.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
