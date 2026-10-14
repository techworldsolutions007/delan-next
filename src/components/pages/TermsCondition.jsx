'use client';
import React from 'react';

/**
 * TermsCondition Component
 * Displays the company's terms and conditions, styled to match other static pages.
 */
const TermsCondition = () => {
  // Custom classes for styling content elements consistently
  const headingStyle = "text-2xl font-semibold text-primary/90 mt-8 mb-4";
  const paragraphStyle = "text-gray-700 mb-4 leading-relaxed";
  const linkStyle = "text-primary hover:underline";

  return (
    <div className="min-h-screen flex flex-col items-center bg-white px-4 pt-16 md:pt-24 pb-16">
      {/* Page Title */}
      <h1 className="cormorant-garamond-700 text-primary text-3xl md:text-4xl lg:text-5xl uppercase mb-8 text-center">
        Terms & Conditions
      </h1>

      {/* Content Container */}
      <div className="w-full max-w-4xl montserrat-500">
        <div className="rounded-xl p-8 md:p-12">
          {/* Policy Content */}
          <p className={paragraphStyle}>
            <strong>Last Updated: 30 September 2025</strong>
          </p>
          <p className={paragraphStyle}>
            Welcome to Delan. By accessing our website and purchasing our products, you agree to comply with and be bound by the following terms and conditions. Please review them carefully.
          </p>

          <h2 className={headingStyle}>1. Eligibility</h2>
          <p className={paragraphStyle}>You must be at least 18 years old or accessing the site under the supervision of a parent or legal guardian to use this website and make a purchase.</p>

          <h2 className={headingStyle}>2. Products & Pricing</h2>
          <p className={paragraphStyle}>
            All prices are displayed in Indian Rupees (INR) and are inclusive of GST unless stated otherwise. Product descriptions and prices are subject to change without prior notice. We strive for accuracy but do not warrant that product descriptions or other content is error-free.
          </p>

          <h2 className={headingStyle}>3. Orders & Payments</h2>
          <p className={paragraphStyle}>
            We reserve the right to refuse or cancel any order for any reason, including limitations on quantities available, inaccuracies in product or pricing information, or issues identified by our fraud avoidance department.
          </p>

          <h2 className={headingStyle}>4. Shipping & Delivery</h2>
          <p className={paragraphStyle}>
            Please refer to our Shipping Policy for detailed information on processing times, delivery estimates, and costs. Delan is not liable for any delays in delivery caused by courier partners or circumstances beyond our control.
          </p>

          <h2 className={headingStyle}>5. Returns & Exchanges</h2>
          <p className={paragraphStyle}>
            All returns and exchanges are subject to our official Returns & Exchanges Policy. By making a purchase, you agree to the terms outlined in that policy.
          </p>

          <h2 className={headingStyle}>6. Intellectual Property</h2>
          <p className={paragraphStyle}>
            All content on this website, including text, graphics, logos, images, and software, is the property of Delan and is protected by Indian and international copyright and trademark laws. Any unauthorized use is strictly prohibited.
          </p>

          <h2 className={headingStyle}>7. User Conduct</h2>
          <p className={paragraphStyle}>
            You agree not to use this site for any unlawful purpose or to post any content that is offensive, defamatory, or harmful. We reserve the right to terminate your access for violating these terms.
          </p>

          <h2 className={headingStyle}>8. Limitation of Liability</h2>
          <p className={paragraphStyle}>
            To the fullest extent permitted by law, Delan shall not be liable for any indirect, incidental, or consequential damages arising from your use of this website or the purchase of any products.
          </p>

          <h2 className={headingStyle}>9. Governing Law</h2>
          <p className={paragraphStyle}>These Terms & Conditions are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in New Delhi, Delhi.</p>

          <h2 className={headingStyle}>10. Contact Information</h2>
          <p className={paragraphStyle}>
            For any questions regarding these terms, please contact us at: <a href="mailto:support@delanonline.com" className={linkStyle}>support@delanonline.com</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsCondition;
