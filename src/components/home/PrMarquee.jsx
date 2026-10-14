'use client';
import React from "react";
import PressStrip from "./PressStrip";

export default function PrMarquee() {
  return (
    <PressStrip
      outerClassName="w-full overflow-hidden py-5"
      containerClassName="bg-accent"
    />
  );
}
