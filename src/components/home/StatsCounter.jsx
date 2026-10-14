'use client';

import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedTooltip } from "../ui/shadcn-io/animated-tooltip";
import SectionHeader from "@/components/ui/SectionHeader";

const STATS = [
  { id: 1, label: "Of Happy Customers", value: "Lakhs" },
  { id: 2, label: "Of Styles Purchased", value: "Millions" },
  { id: 3, label: "Offline Stores Near You", value: 5 },
];

const people = [
  {
    id: 1,
    name: "Perfect fit",
    designation: "Aisha Verma",
    image:
      "https://plus.unsplash.com/premium_photo-1682089810582-f7b200217b67?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=387",
  },
  {
    id: 2,
    name: "Elegant silhouettes",
    designation: "Neha Iyer",
    image:
      "https://plus.unsplash.com/premium_photo-1705563088245-345abc31ad95?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=387",
  },
  {
    id: 3,
    name: "Vibrant prints",
    designation: "Riya Sharma",
    image:
      "https://images.unsplash.com/photo-1581564018992-95e729d4940e?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=387",
  },
  {
    id: 4,
    name: "Premium fabric",
    designation: "Meera Nair",
    image:
      "https://plus.unsplash.com/premium_photo-1733608178136-47228667977f?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=870",
  },
  {
    id: 5,
    name: "Flattering cuts",
    designation: "Kavya Joshi",
    image:
      "https://plus.unsplash.com/premium_photo-1664910500054-608d23c060f8?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=870",
  },
  {
    id: 6,
    name: "Great value",
    designation: "Pooja Menon",
    image:
      "https://plus.unsplash.com/premium_photo-1682089894837-e01e5cb8e471?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=580",
  },
];

const easeOut = (t) => 1 - Math.pow(1 - t, 3);

function useCountUp(target, run, duration = 2000) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!run) return;
    if (typeof target !== "number") return;

    let raf = 0;
    let start = 0;

    const tick = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(easeOut(p) * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, target, duration]);

  return val;
}

function StatItem({ label, value, run }) {
  const isNumber = typeof value === "number";
  const count = useCountUp(isNumber ? value : 0, run);

  return (
    <Card className="bg-transparent shadow-none border-none w-full h-full">
      <CardContent className="px-2 sm:px-4 py-3 text-center h-full flex flex-col items-center justify-center">
        <h3
          className="
            montserrat-600 font-bold text-primary text-center
            text-2xl sm:text-4xl leading-snug
            min-h-[3.2rem] sm:min-h-[4.2rem]
            flex items-center justify-center
          "
          aria-live="polite"
        >
          {isNumber ? count.toLocaleString() : value}
        </h3>

        <p className="montserrat-500 mt-2 text-[11px] sm:text-sm text-neutral-800">
          {label}
        </p>
      </CardContent>
    </Card>
  );
}

export default function StatsCounter() {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section>
      <div className="mx-auto max-w-[960px] px-4 text-center text-primary py-10">
        <SectionHeader
          title="25 Years of Making Women Feel Seen"
          subtitle="Started in a single store, now dressing women across India — the same commitment to quality, fit, and silhouette that began it all."
          showSubtitle
          subtitleClassName="tracking-[0.025em] leading-snug"
          className="max-w-[960px]"
        />

        <div className="flex items-center justify-center gap-2 pt-4 pb-2">
          <AnimatedTooltip items={people} />
        </div>
      </div>

      {/* <div className="px-4 py-10">
        <div
          ref={ref}
          className="
            mx-auto max-w-[700px] w-full
            flex flex-row items-stretch justify-between
            divide-x divide-[rgba(100,44,68,0.2)]
          "
        >
          {STATS.map((s) => (
            <div key={s.id} className="flex-1 min-w-0 px-2 sm:px-4 flex items-stretch">
              <StatItem label={s.label} value={s.value} run={visible} />
            </div>
          ))}
        </div>
      </div> */}
    </section>
  );
}
