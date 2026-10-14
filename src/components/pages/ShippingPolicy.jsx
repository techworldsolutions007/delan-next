'use client';
import React from "react";

const ShippingPolicy = () => {
  // Custom classes for styling content elements consistently
  const headingStyle = "text-2xl font-semibold text-primary/90 mt-8 mb-4";
  const paragraphStyle = "text-gray-700 mb-4 leading-relaxed";
  const listStyle = "list-disc list-inside space-y-2 mb-4 text-gray-700 ";
  const linkStyle = "text-primary hover:underline";

  return (
    <div className="min-h-screen flex flex-col items-center bg-white px-4 pt-16 md:pt-24 pb-16">
      {/* Page Title */}
      <h1 className="cormorant-garamond-700 text-primary text-3xl md:text-4xl lg:text-5xl uppercase mb-8 text-center">
        Shipping & Delivery Policy
      </h1>

      {/* Content Container */}
      <div className="w-full max-w-4xl montserrat-500">
        <div className="rounded-xl p-8 md:p-12">
          {/* ------------------ START OF EXACT CONTENT ------------------ */}

          <p className={paragraphStyle}>
            <strong>Last Updated: 30 September 2025</strong>
          </p>

          <p className={paragraphStyle}>
            At Delan, we are committed to providing an elegant and seamless
            shopping experience, from browsing our collections to the moment
            your order arrives at your door. This policy outlines everything you
            need to know about our shipping process, timelines, and how we
            partner with trusted third-party delivery agencies to bring your
            order to you.
          </p>

          <h2 className={headingStyle}>Our Shipping & Handling Process</h2>

          <p className={paragraphStyle}>
            Our fulfillment process is designed to be clear and efficient,
            ensuring you receive your items as quickly as possible.
          </p>

          <ul className={listStyle}>
            <li>
              Order Processing: All orders are processed and dispatched from our
              warehouse in Faridabad (Delhi NCR) within 1-2 business days
              (Monday-Saturday, excluding public holidays).
            </li>
            <li>
              Shipment Handover: Once your order is processed and has passed our
              quality check, it is securely packed and handed over to one of our
              trusted third-party courier partners.
            </li>
            <li>
              Order Confirmation: You will receive a shipment confirmation email
              with your tracking ID and a link to track your package as soon as
              your order is dispatched.
            </li>
          </ul>

          <h2 className={headingStyle}>
            Shipping & Delivery Timelines (India)
          </h2>

          <p className={paragraphStyle}>
            We currently only deliver to addresses within India. Our standard
            delivery time is an estimated 10-12 business days.
          </p>

          <h2 className={headingStyle}>
            A Note on Delivery Timelines (Our "No Over Promise" Guarantee)
          </h2>

          <p className={paragraphStyle}>
            The 10-12 business day window is an estimate provided by our
            third-party logistics partners, such as Blue Dart, Delhivery, Ecom
            Express, and others. While we and our partners strive to meet these
            timelines, Delan does not guarantee delivery dates.
          </p>

          <p className={paragraphStyle}>
            Once a package is handed over to the carrier, the delivery is
            managed by their operations. Delan is not responsible for delivery
            delays caused by the carrier, inclement weather, natural disasters,
            public holidays, or other unforeseen circumstances outside of our
            reasonable control. We will, however, always act as your advocate
            and help you resolve any issues.
          </p>

          <h2 className={headingStyle}>How to Track Your Order</h2>

          <ul className={listStyle}>
            <li>
              Tracking your order is simple. Once your order is dispatched, you
              will receive an email and/or SMS containing your tracking number
              and the name of the courier partner.
            </li>
            <li>
              Please wait up to 24 hours for the tracking link to become active
              on the carrier's website.
            </li>
            <li>
              You can use this link to see the real-time status of your
              delivery.
            </li>
            <li>
              If you have an account with us, you can also find tracking
              information in the 'My Orders' section of your Delan profile.
            </li>
          </ul>

          <h2 className={headingStyle}>
            Handling Shipping Issues (Lost, Damaged, or Incorrect Items)
          </h2>

          <p className={paragraphStyle}>
            Your satisfaction is our top priority. While we partner with India's
            best carriers, issues can occasionally occur. If you experience any
            problems with your delivery, please contact our Customer Care team
            directly at{" "}
            <a href="mailto:support@delanonline.com" className={linkStyle}>
              support@delanonline.com
            </a>{" "}
            or call us at{" "}
            <a href="tel:+919310329849" className={linkStyle}>
              +91-9310329849
            </a>{" "}
            (Mon-Sat, 10 AM – 6 PM).
          </p>

          <p className={paragraphStyle}>
            Please do not contact the courier company first. By contacting us
            directly, we can coordinate with the carrier on your behalf and
            ensure a faster resolution.
          </p>

          <h2 className={headingStyle}>
            If Your Package is Marked "Delivered" But Not Received:
          </h2>

          <ul className={listStyle}>
            <li>
              First, please check with family members, neighbors, and building
              security to see if someone accepted the package on your behalf.
            </li>
            <li>
              If you still cannot locate your package, you must contact us
              within 48 hours of the "delivered" status update.
            </li>
            <li>
              We will then launch an investigation with our courier partner,
              which includes requesting proof of delivery. This process can take
              3-5 business days.
            </li>
          </ul>

          <h2 className={headingStyle}>
            If Your Package Arrives Damaged or with Missing Items:
          </h2>

          <ul className={listStyle}>
            <li>
              To help us resolve this for you quickly, you must contact us
              within 48 hours of receiving the package.
            </li>
            <li>
              Crucial Step: Please provide your order number, 2-3 clear photos
              of the damaged item, and photos of the outer shipping box and
              packaging.
            </li>
            <li>
              Unboxing Video: For all claims of damage or missing items, we
              highly recommend providing a clear, un-edited unboxing video from
              the moment you open the outer shipping box. This is the fastest
              and most secure way for us to process your claim and arrange a
              replacement or refund.
            </li>
            <li>
              Please keep all original packaging until the issue is resolved, as
              the carrier may need to inspect it.
            </li>
          </ul>

          <h2 className={headingStyle}>Other Shipping Information</h2>

          <ul className={listStyle}>
            <li>
              P.O. Boxes: We are unable to ship to P.O. boxes or APO/FPO
              addresses.
            </li>
            <li>
              Address Changes: We cannot modify the shipping address once an
              order has been dispatched.
            </li>
            <li>
              International Shipping: Currently, Delan.in only ships within
              India.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ShippingPolicy;
