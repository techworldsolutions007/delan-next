import Image from "next/image";

/**
 * Mobile  → renders in-flow below the sticky navbar (navbar stays visible)
 * Desktop → fixed full-screen overlay (premium feel)
 */
export default function LoadingScreen() {
  return (
    <div
      className={[
        /* shared */
        "bg-white flex items-center justify-center",
        /* mobile: static, fills ~content area height */
        "min-h-[72vh]",
        /* desktop: full-screen overlay */
        "md:fixed md:inset-0 md:z-[9999] md:min-h-0",
      ].join(" ")}
      style={{ animation: "overlay-fade-in 0.18s ease-out both" }}
    >
      {/* centre group — shift up slightly on desktop to feel optically centred */}
      <div className="flex flex-col items-center gap-7 md:-mt-12">

        {/* Logo with heartbeat */}
        <div style={{ animation: "logo-heartbeat 1.4s ease-in-out infinite" }}>
          <Image
            src="/images/delan_icon2.png"
            alt="Delan"
            width={88}
            height={88}
            priority
          />
        </div>

        {/* Three staggered dots */}
        <div className="flex items-center gap-[7px]">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block h-[7px] w-[7px] rounded-full bg-[#5c2d3e]"
              style={{
                animation: "dot-pulse 1.2s ease-in-out infinite",
                animationDelay: `${i * 0.22}s`,
              }}
            />
          ))}
        </div>

      </div>
    </div>
  );
}
