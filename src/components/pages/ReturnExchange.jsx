'use client';
import React from 'react';

const ReturnExchange = () => {
  const headingStyle = "montserrat-600 text-2xl text-primary/90 mt-8 mb-4";
  const paragraphStyle = "montserrat-400 text-gray-700 mb-4 leading-relaxed";
  const listStyle = "list-disc pl-5 space-y-2 mb-4 text-gray-700 leading-relaxed montserrat-400";
  const linkStyle = "text-primary hover:underline";

  return (
    <div className="min-h-screen flex flex-col items-center bg-white px-4 pt-10 md:pt-14 pb-12">
      <h1 className="cormorant-garamond-700 text-primary text-3xl md:text-4xl lg:text-5xl uppercase mb-4 md:mb-5 text-center">
        Returns &amp; Exchanges — 7-Day Hassle-Free Policy
      </h1>

      <div className="w-full max-w-4xl montserrat-400">
        <div className="rounded-xl p-8 md:p-12">
          <p className={paragraphStyle}>
            Thank you for shopping with DELAN. We are committed to providing a seamless and premium experience. If you are not completely satisfied with your purchase, please review our policy below.
          </p>

          {/* Initiate Return / Exchange CTA */}
          <div className="bg-[#f9f5f0] border border-primary/20 rounded-xl p-6 md:p-8 mb-8">
            <h2 className="montserrat-600 text-2xl text-primary/90 mb-3">
              Initiate a Return or Exchange
            </h2>
            <p className="montserrat-400 text-gray-700 mb-4 leading-relaxed">
              To start your return or exchange, you will need:
            </p>
            <ul className="list-none space-y-3 mb-5 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="montserrat-700 text-primary mt-0.5">1.</span>
                <span className="montserrat-400">
                  <span className="montserrat-600">Order Number:</span> your 3 or 4-digit order number found in your confirmation email or account (e.g.{' '}
                  <span className="montserrat-600 text-primary">#1600</span>)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="montserrat-700 text-primary mt-0.5">2.</span>
                <span className="montserrat-400">
                  <span className="montserrat-600">Email Address:</span> the email you used when placing the order (e.g.{' '}
                  <span className="montserrat-600 text-primary">abc@gmail.com</span>)
                </span>
              </li>
            </ul>
            <p className="montserrat-400 text-gray-600 text-sm mb-5 leading-relaxed">
              Click the button below, enter your order number and email on the portal, and follow the on-screen steps to submit your return or exchange request.
            </p>
            <a
              href="https://delan1.myshopify.com/apps/return_prime"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-primary text-white montserrat-600 text-sm uppercase tracking-widest px-8 py-3 rounded-lg hover:bg-primary/90 transition-colors duration-200"
            >
              Start Return / Exchange
            </a>
          </div>

          <h2 className={headingStyle}>1. Eligibility for Returns &amp; Exchanges</h2>
          <ul className={listStyle}>
            <li>Products may be returned or exchanged within 7 days of delivery.</li>
            <li>To be eligible, the item must be unused, unwashed, and in original condition, with all tags, packaging, and seal intact.</li>
            <li>Items with a broken seal are not eligible for return, but may be considered for exchange.</li>
            <li>Each order is eligible for a one-time exchange only, subject to availability.</li>
          </ul>

          <h2 className={headingStyle}>2. Return Policy</h2>
          <ul className={listStyle}>
            <li>Return requests must be initiated within 7 days from the date of delivery.</li>
            <li>A return shipping fee of Rs. 300 will be applicable and deducted from the refund amount.</li>
            <li>Shipping charges paid at the time of order, if any, are non-refundable.</li>
            <li>Refunds will be processed only after the product is received and successfully inspected at our warehouse.</li>
            <li>Once approved, refunds are issued within 5-7 business days.</li>
          </ul>

          <h2 className={headingStyle}>3. Exchange Policy</h2>
          <ul className={listStyle}>
            <li>Products may be exchanged for a different size or color of the same item, subject to availability.</li>
            <li>Exchange requests must be submitted within 7 days of delivery.</li>
            <li>An exchange fee of Rs. 300 will be charged for processing an exchange.</li>
            <li>Our team will arrange a reverse pickup once the request is approved.</li>
            <li>If the requested size or color is unavailable, you may choose a refund or an alternative product.</li>
            <li>Any price difference will be communicated and must be settled before processing the exchange.</li>
          </ul>

          <h2 className={headingStyle}>4. Non-Returnable Items</h2>
          <p className={paragraphStyle}>The following items are not eligible for return or exchange:</p>
          <ul className={listStyle}>
            <li>Items marked as "Final Sale" or "Non-Returnable".</li>
            <li>Customized or personalized products, unless received damaged or incorrect.</li>
          </ul>

          <h2 className={headingStyle}>5. Reverse Pickup &amp; Processing</h2>
          <ul className={listStyle}>
            <li>DELAN provides reverse pickup services for eligible returns and exchanges.</li>
            <li>Once the product is received at our warehouse, it will undergo a quality check.</li>
            <li>Refunds are processed within 5-7 business days after approval.</li>
            <li>Exchanges are dispatched within 2-3 business days, subject to availability.</li>
          </ul>

          <h2 className={headingStyle}>6. Damaged / Defective / Incorrect Products</h2>
          <ul className={listStyle}>
            <li>If you receive a damaged, defective, or incorrect product, you must report it within 48 hours of delivery.</li>
            <li>Customers are required to provide clear images or videos for verification.</li>
            <li>Upon approval, DELAN will offer a replacement or full refund, with no return charges applied.</li>
          </ul>

          <h2 className={headingStyle}>7. Order Cancellation</h2>
          <ul className={listStyle}>
            <li>Orders can be canceled only before they are shipped.</li>
            <li>Once shipped, cancellation requests will not be accepted, and the return policy will apply.</li>
          </ul>

          <h2 className={headingStyle}>8. Cash on Delivery (COD)</h2>
          <ul className={listStyle}>
            <li>Cash on Delivery (COD) is not available for orders exceeding Rs. 5,000.</li>
            <li>DELAN reserves the right to enable or disable COD based on order value and serviceability.</li>
          </ul>

          <h2 className={headingStyle}>9. Important Notes</h2>
          <ul className={listStyle}>
            <li>All returned items are subject to quality inspection. DELAN reserves the right to reject returns that do not meet the policy conditions.</li>
            <li>Products that fail the quality check will be sent back to the customer.</li>
            <li>When returning an item, please ensure that the correct product is sent back. If a wrong item is returned, we will try our best to assist in recovering it; however, DELAN will not be responsible for any loss or damage.</li>
            <li>Requests raised outside the defined timeline will not be accepted.</li>
          </ul>

          <h2 className={headingStyle}>10. Contact Us</h2>
          <p className={paragraphStyle}>
            If you have any questions or need assistance, please contact us: <br />
            <span className="montserrat-600">Email:</span>{' '}
            <a href="mailto:support@delanonline.com" className={linkStyle}>support@delanonline.com</a> <br />
            <span className="montserrat-600">Phone:</span>{' '}
            <a href="tel:+919310329849" className={linkStyle}>+91 93103 29849</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReturnExchange;
