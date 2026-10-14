'use client';
import React from 'react';

const PrivacyPolicy = () => {
  // Custom classes for styling content elements consistently
  const headingStyle = "text-2xl font-semibold text-primary/90 mt-8 mb-4";
  const paragraphStyle = "text-gray-700 mb-4 leading-relaxed";
  const listStyle = "list-disc list-inside space-y-2 mb-4";
  const linkStyle = "text-primary hover:underline";

  return (
    <div className="min-h-screen flex flex-col items-center bg-white px-4 pt-16 md:pt-24 pb-16">
      {/* Page Title */}
      <h1 className="cormorant-garamond-700 text-primary text-3xl md:text-4xl lg:text-5xl uppercase mb-8 text-center">
        Privacy Policy
      </h1>

      {/* Content Container */}
      <div className="w-full max-w-4xl montserrat-500">
        <div className="rounded-xl p-8 md:p-12">
          {/* Policy Content */}
          <p className={paragraphStyle}>
            <strong>Last Updated: 30 September 2025</strong>
          </p>
          <p className={paragraphStyle}>
            Welcome to Delan ("we," "us," "our"). We are committed to protecting your privacy and
            ensuring the security of your personal information. This Privacy Policy outlines how we
            collect, use, disclose, and safeguard your data when you visit our website and purchase
            our products.
          </p>

          <h2 className={headingStyle}>1. Information We Collect</h2>
          <ul className={listStyle}>
            <li>
              <strong>Personally Identifiable Information (PII):</strong> We may collect your full name, email address, mobile number, and shipping and billing addresses when you place an order.
            </li>
            <li>
              <strong>Non-Personal Information:</strong> We automatically collect information like your IP address, browser type and version, device details, and browsing activity to improve our site.
            </li>
            <li>
              <strong>Payment Information:</strong> All payments are processed securely via trusted third-party gateways (e.g., Stripe, Razorpay). We do not store your credit card numbers or other sensitive payment details on our servers.
            </li>
          </ul>

          <h2 className={headingStyle}>2. How We Use Your Information</h2>
          <ul className={listStyle}>
            <li>To process, fulfill, and ship your orders efficiently.</li>
            <li>To communicate with you regarding your orders, answer your queries, and provide customer support.</li>
            <li>For marketing and promotional updates, but only if you have given your explicit consent (opt-in).</li>
            <li>To improve our website, products, and overall customer experience.</li>
            <li>For fraud prevention, to enhance security, and to comply with legal obligations.</li>
          </ul>

          <h2 className={headingStyle}>3. Data Sharing and Disclosure</h2>
          <p className={paragraphStyle}>
            We do not sell, trade, or rent your personal data to third parties. We may share your information only with trusted partners essential for our operations, such as courier services for delivery and payment gateways for processing transactions.
          </p>

          <h2 className={headingStyle}>4. Security Measures</h2>
          <p className={paragraphStyle}>
            We implement industry-standard security measures, including SSL encryption, to protect your personal data from unauthorized access, alteration, or disclosure.
          </p>
          
          <h2 className={headingStyle}>5. Your Rights and Choices</h2>
          <p className={paragraphStyle}>
            You have the right to access, update, or correct your personal data at any time through your account settings. You can also unsubscribe from our marketing communications at any point by clicking the "unsubscribe" link in our emails.
          </p>

          <h2 className={headingStyle}>6. Contact / Grievance Officer</h2>
          <p className={paragraphStyle}>
            For any questions about this policy or to address any grievances, please contact us: <br />
            <strong>Email:</strong> <a href="mailto:privacy@delan.in" className={linkStyle}>privacy@delan.in</a> <br />
            <strong>Phone:</strong> <a href="tel:+919310329849" className={linkStyle}>+91 93103 29849</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
