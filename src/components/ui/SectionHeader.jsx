'use client';
import React from "react";
import { cn } from "@/lib/utils";

/**
 * SectionHeader — Shared centered homepage section header.
 *
 * @param {object} props
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {boolean} [props.showSubtitle]
 * @param {string} [props.className]
 * @param {string} [props.titleClassName]
 * @param {string} [props.subtitleClassName]
 */
export default function SectionHeader({
  title,
  subtitle,
  showSubtitle = false,
  className = "",
  titleClassName = "",
  subtitleClassName = "",
}) {
  return (
    <div className={cn("mx-auto max-w-3xl text-center text-primary", className)}>
      <h2
        className={cn(
          "cormorant-garamond-700 uppercase text-primary text-3xl md:text-4xl lg:text-[2.6rem] leading-[1.15] tracking-[0.02em]",
          titleClassName
        )}
      >
        {title}
      </h2>
      {showSubtitle && subtitle ? (
        <p
          className={cn(
            "mt-1.5 text-primary montserrat-500 text-[14px] md:text-[15px] leading-snug tracking-[0.025em]",
            subtitleClassName
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
