'use client';
import React from "react";
import PressStrip from "./PressStrip";

export default function PrBanner() {
  return (
    <PressStrip
      outerClassName="w-full overflow-hidden bg-muted/30 py-5"
      containerClassName="bg-accent"
    />
  );
}
