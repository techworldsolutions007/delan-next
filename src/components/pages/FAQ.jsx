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
      <h1 className="cormorant-garamond-700 text-primary text-3xl md:text-4xl lg:text-5xl uppercase mb-8 text-center">
        Frequently Asked Questions
      </h1>

      {/* Content Container */}
      <div className="w-full max-w-4xl montserrat-500">
        <div className="rounded-xl p-8 md:p-12">
          {/* FAQ Content */}

          <h2 className={questionStyle}>1. What payment methods do you accept?</h2>
          <p className={answerStyle}>
            We accept all major credit cards, debit cards, UPI, and other popular payment wallets through our secure third-party payment gateways.
          </p>

          <h2 className={questionStyle}>2. How long does shipping take?</h2>
          <p className={answerStyle}>
            Standard shipping typically takes 10-12 business days for most locations within India. You can find more detailed information on our Shipping Policy page.
          </p>

          <h2 className={questionStyle}>3. What is your return and exchange policy?</h2>
          <p className={answerStyle}>
            We offer a 7-day return policy for refunds and a 7-day exchange policy for size or color changes. For complete details and eligibility conditions, please visit our
 <a href="/returns-exchange" className={linkStyle}> Returns & Exchanges</a> page.
          </p>

          <h2 className={questionStyle}>4. How can I track my order?</h2>
          <p className={answerStyle}>
            Once your order is shipped, you will receive an email with a tracking number and a link to the courier's website. You can also use the "Track Order" feature on our website.
          </p>

          <h2 className={questionStyle}>5. Do you ship internationally?</h2>
          <p className={answerStyle}>
            Currently, we only ship within India. We are working on expanding our services to international locations in the near future.
          </p>

          <h2 className={questionStyle}>6. How do I contact customer support?</h2>
          <p className={answerStyle}>
            You can reach our customer support team by emailing us at <a href="mailto:support@delanonline.com" className={linkStyle}>support@delanonline.com</a> or by calling us at <a href="tel:+919310329849" className={linkStyle}>+91 93103 29849</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
