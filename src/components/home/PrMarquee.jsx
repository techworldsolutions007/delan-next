'use client';
import React from "react";
import PressStrip from "./PressStrip";

export default function PrMarquee() {
  return (
    <PressStrip
      outerClassName="w-full overflow-hidden pt-10 pb-0 md:pt-14"
      containerClassName="bg-accent"
    />
  );
}
