'use client';
import React from "react";

/* Keep your existing icons */
const Return = "/icons/exchange.png";
const Fit = "/icons/fit.png";
const Made = "/icons/made.png";
const Years = "/icons/25years.png";

/* Default items – unchanged */
const DEFAULT_USPS = [
  { icon: Made, text: "Made In India" },
  { icon: Return, text: "7 Day Return/Exchange" },
  { icon: Fit, text: "Made to Fit Indian Body" },
  { icon: Years, text: "25 Years of Excellence" },
];


export default function ProductUSP({
  items = DEFAULT_USPS,
  className = "",
  title = "",}) {
  return (
    <section
      aria-label={title || "Product benefits"}
      className={`w-full bg-primary ${className}`}
    >
      <div className="mx-auto max-w-[980px] px-4 py-5 text-white sm:px-6 sm:py-6">
        {title ? <h2 className="sr-only">{title}</h2> : null}

        <ul
          role="list"
          className="grid grid-cols-2 gap-x-4 gap-y-10 items-start justify-items-center sm:grid-cols-4 sm:gap-x-6 sm:gap-y-6"
        >
          {items.map((usp) => (
            <li key={usp.text} role="listitem" className="w-full">
              <div className="mx-auto flex h-full max-w-[11rem] flex-col items-center text-center">
                <div className="mb-4 grid h-11 w-11 place-items-center sm:h-14 sm:w-14 md:h-16 md:w-16">
                  <img
                    src={usp.icon}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    draggable="false"
                    className="h-full w-full object-contain"
                  />
                </div>
                <p className="text-[11px] font-semibold leading-snug sm:text-[13px] md:text-[15px] sm:whitespace-nowrap tracking-[0.025em] uppercase font-montserrat">
                  {usp.text}
                </p>
              </div>
            </li>
          ))}
        </ul>

      </div>
    </section>
  );
}
