'use client';
// src/pages/Fabrics.jsx
import React, { useMemo } from "react";
import Image from "next/image";

const Fabrics = () => {
  /* ---- match AboutUs styling ---- */
  const headingStyle = "text-2xl font-semibold text-primary/90 mt-10 mb-4";
  const paragraphStyle = "text-gray-700 mb-4 leading-relaxed text-justify";

  const HERO_IMG =
    // "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/DSC00275_copy.jpg?v=1767802538";
    "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/Untitled_design_14.png?v=1768206156"

  /* ---- your fabric library ---- */
  const FABRICS = useMemo(
    () => [
      {
        id: "cotton-linen",
        name: "Cotton Linen",
        tags: ["cotton", "linen", "breathable", "everyday", "quiet-luxury"],
        why: `We chose cotton linen because it delivers comfort without compromise. It allows the skin to breathe, moves naturally with the body, and holds a soft structure that feels effortless yet composed. For DELAN, fabric must support real wear—long hours, changing weather, and everyday movement—while still looking elevated. Cotton linen does exactly that, making it a natural choice for pieces designed to be lived in, not just styled.`,
        does: `Cotton linen keeps you cool, comfortable, and at ease throughout the day. Its breathable weave allows airflow, while the cotton balance softens the texture against the skin. The result is a fabric that feels light, relaxed, and wearable for extended hours, without clinging or discomfort. Over time, it only gets better—becoming softer while retaining its natural elegance.`,
        luxury: `The luxury of cotton linen lies in its restraint. It doesn’t shine, stretch, or demand attention. Instead, it offers a calm richness—visible in its texture, felt in its comfort, and trusted in its durability. This is quiet luxury at its best: understated, breathable, and confident. A fabric that looks refined without trying too hard, perfectly aligned with DELAN’s philosophy of comfort as a form of elegance.`,
      },
      {
        id: "rubber-print-cotton-poplin",
        name: "Rubber Print Cotton Poplin",
        tags: ["cotton", "poplin", "printed", "structured", "modern"],
        why: `We chose rubber print cotton poplin to bring together precision and comfort. Poplin offers a smooth, breathable base that feels crisp yet light on the skin, while the rubber print adds depth, structure, and a contemporary design language. For DELAN, prints should feel intentional—not heavy or overwhelming. This fabric allows us to introduce statement elements without compromising wearability.`,
        does: `This fabric feels light and breathable while maintaining a clean, polished look. The poplin base keeps the garment cool and comfortable for long hours, while the rubber print adds subtle texture and definition without stiffness. It holds its shape well, resists excessive creasing, and feels easy on the body—making it ideal for elevated everyday wear.`,
        luxury: `The luxury here is in the contrast. A smooth, classic cotton base paired with a refined, tactile print creates interest without excess. The rubber print doesn’t shout—it sits calmly on the surface, adding character and modernity. It’s a quiet statement: thoughtful design, controlled detail, and comfort that remains uncompromised. Exactly how DELAN approaches contemporary luxury.`,
      },
      {
        id: "schiffli-cotton-poplin",
        name: "Schiffli Cotton Poplin",
        tags: ["cotton", "poplin", "embroidered", "airy", "craft"],
        why: `We chose Schiffli cotton poplin to bring softness and detail into everyday elegance. The poplin base offers breathability and comfort, while the Schiffli embroidery adds texture, craftsmanship, and visual lightness. For DELAN, detailing should feel delicate—not heavy. This fabric allows us to introduce femininity and design depth while keeping the garment easy, wearable, and breathable.`,
        does: `This fabric feels light, airy, and gentle on the skin. The cotton poplin base keeps the garment cool and structured, while the Schiffli work allows airflow and adds softness to the overall feel. It’s comfortable for extended wear and ideal for warm weather, offering elegance without weight or restriction.`,
        luxury: `The luxury of Schiffli cotton poplin lies in its craftsmanship. The embroidery is subtle, detailed, and intentional—meant to be noticed up close, not from a distance. It adds grace without excess, texture without heaviness. This is quiet luxury expressed through detail, where comfort and artistry coexist effortlessly, in true DELAN style.`,
      },
      {
        id: "cotton-poplin",
        name: "Cotton Poplin",
        tags: ["cotton", "poplin", "crisp", "polished", "everyday"],
        why: `We chose cotton poplin for its balance of clarity and comfort. It has a naturally smooth surface, a light structure, and a breathable weave that feels clean against the skin. For DELAN, this fabric represents reliability—something you can wear through long days without feeling restricted or uncomfortable. Cotton poplin allows our designs to stay sharp while remaining easy to live in.`,
        does: `Cotton poplin feels crisp yet soft, offering comfort that lasts throughout the day. Its breathable nature helps regulate temperature, while its structured finish keeps the garment looking polished. It moves easily with the body, resists excessive creasing, and feels light even after hours of wear—making it ideal for everyday, elevated dressing.`,
        luxury: `The luxury of cotton poplin lies in its simplicity. There is no excess shine or weight—only a clean, confident finish that looks refined without effort. It’s a fabric that holds its shape, feels composed, and wears beautifully over time. This understated elegance reflects DELAN’s belief that true luxury doesn’t need embellishment—it’s built into the fabric itself.`,
      },
      {
        id: "lightweight-viscose-twill",
        name: "Light Weight Viscose Twill",
        tags: ["viscose", "twill", "fluid", "breathable", "drape"],
        why: `We chose lightweight viscose twill because it moves with quiet ease. It offers a soft fall, fluid structure, and a smooth finish that feels relaxed yet refined. For DELAN, fabric must support natural movement without compromising on form. This twill allows our silhouettes to feel effortless while maintaining a composed, elevated look.`,
        does: `This fabric feels light, breathable, and gentle on the skin. Its twill weave adds subtle strength while allowing graceful drape, preventing stiffness or heaviness. The result is a garment that flows comfortably, holds its shape, and stays polished through long hours of wear.`,
        luxury: `The luxury of viscose twill lies in how it behaves rather than how it looks. It doesn’t cling or restrict—it follows the body with ease. Its smooth texture and fluid movement create a refined presence that feels calm and intentional. This is quiet luxury defined by comfort, balance, and effortless elegance—true to DELAN’s philosophy.`,
      },
      {
        id: "heavyweight-viscose-twill",
        name: "Heavy Weight Viscose Twill",
        tags: ["viscose", "twill", "structured", "substantial", "drape"],
        why: `We chose heavyweight viscose twill for its ability to hold form while remaining comfortable. It offers a richer fall, stronger structure, and a refined weight that enhances the silhouette without feeling rigid. For DELAN, this fabric allows us to create pieces that feel substantial yet easy—designed to drape beautifully and stay composed through long wear.`,
        does: `This fabric provides a reassuring weight with a smooth, fluid feel against the skin. Its denser twill weave offers better shape retention while allowing natural movement. It feels grounded, comfortable, and polished—ideal for garments that require structure without sacrificing softness or wearability.`,
        luxury: `The luxury of heavyweight viscose twill lies in its presence. It doesn’t need shine or embellishment to feel premium—the weight itself communicates refinement. The way it drapes, holds, and moves creates a confident elegance that feels intentional and enduring. This is quiet luxury with substance—thoughtful, balanced, and unmistakably DELAN.`,
      },
      {
        id: "heavy-satin-silk",
        name: "Heavy Satin Silk",
        tags: ["silk", "satin", "soft", "sheen", "evening"],
        why: `We chose heavy satin silk for its depth, drape, and natural elegance. It has a smooth surface and a fluid weight that allows the fabric to fall beautifully while feeling substantial on the body. For DELAN, silk should feel balanced—not delicate or overwhelming. This heavier satin silk gives us the richness of silk with a composed, wearable structure.`,
        does: `This fabric feels soft and luxurious against the skin while offering a reassuring weight. Its satin weave creates a gentle sheen without excess shine, allowing the garment to look refined rather than flashy. It drapes smoothly, moves with ease, and feels comfortable for extended wear, making it ideal for elevated silhouettes.`,
        luxury: `The luxury of heavy satin silk lies in its restraint. The sheen is subtle, the fall is controlled, and the presence is unmistakably refined. It doesn’t demand attention—it earns it through texture, weight, and movement. This is quiet luxury expressed through silk that feels grounded, confident, and timeless, in true DELAN fashion.`,
      },
      {
        id: "chanderi-silk",
        name: "Chanderi Silk",
        tags: ["silk", "heritage", "light", "breathable", "sheen"],
        why: `We chose Chanderi silk for its lightness, grace, and quiet heritage. It carries a natural translucence and a soft structure that feels elegant without weight. For DELAN, tradition must feel wearable and relevant. Chanderi silk allows us to honour craftsmanship while creating silhouettes that remain effortless and comfortable.`,
        does: `This fabric feels light, breathable, and gentle on the skin. Its airy weave allows natural airflow, making it comfortable even in warmer climates. Chanderi silk drapes softly, moves with ease, and offers a refined finish that feels elevated without feeling heavy or restrictive.`,
        luxury: `The luxury of Chanderi silk lies in its subtlety. Its sheen is delicate, its texture is refined, and its beauty reveals itself gradually. It doesn’t rely on excess ornamentation—its elegance comes from tradition, craftsmanship, and lightness. This is quiet luxury rooted in heritage, thoughtfully reimagined through DELAN’s modern lens.`,
      },
      {
        id: "silk-organza",
        name: "Silk Organza",
        tags: ["silk", "organza", "sheer", "structured", "layering"],
        why: `We chose silk organza for its lightness and architectural beauty. It offers a crisp yet airy structure that allows garments to hold shape without feeling heavy. For DELAN, this fabric adds dimension and softness without excess. Silk organza lets us play with layers, volume, and detail while keeping the overall feel elegant and wearable.`,
        does: `Silk organza feels weightless on the skin while providing gentle structure. Its sheer, breathable nature allows airflow and comfort, making it ideal for layering and detailing. The fabric holds form beautifully, creating silhouettes that feel light, refined, and effortlessly balanced.`,
        luxury: `The luxury of silk organza lies in its transparency and restraint. It doesn’t overwhelm—it elevates. The crisp texture, subtle sheen, and delicate finish create a refined presence that feels intentional rather than dramatic. This is quiet luxury expressed through lightness—subtle, graceful, and thoughtfully designed in the DELAN way.`,
      },
      {
        id: "denim",
        name: "Denim",
        tags: ["denim", "durable", "timeless", "structured", "everyday"],
        why: `We chose denim for its strength, versatility, and timeless character. But at DELAN, denim is never about rigidity or trend-driven styling. We focus on denim that feels balanced—structured enough to hold its shape, yet comfortable enough for all-day wear. This fabric allows us to create pieces that feel dependable, effortless, and modern.`,
        does: `Denim offers durability with comfort. It provides structure while allowing natural movement, making it ideal for extended wear. The fabric feels reassuring on the body, adapts over time, and maintains its form through repeated use. It’s made for real days—easy, reliable, and wearable without compromise.`,
        luxury: `The luxury of denim lies in its honesty. There is no excess shine or fragility—only confidence built into the fabric itself. A well-crafted denim piece doesn’t try to impress; it simply lasts, wears beautifully, and feels right every time you put it on. This is quiet luxury through substance and simplicity—timeless, grounded, and unmistakably DELAN.`,
      },
      {
        id: "rhinestone-velvet",
        name: "Rhinestone Velvet",
        tags: ["velvet", "embellished", "soft", "warmth", "occasion"],
        why: `We chose rhinestone velvet to bring depth and subtle glamour into our fabric palette. Velvet offers a rich, soft base with a natural sense of warmth and presence, while the rhinestone detailing adds light without overpowering the fabric. For DELAN, embellishment must feel balanced—never excessive. This fabric allows us to introduce shine while keeping comfort and wearability intact.`,
        does: `This fabric feels plush and soft against the skin, offering comfort along with visual richness. The velvet base provides warmth and structure, while the rhinestones add gentle highlights rather than heavy sparkle. The result is a garment that feels elevated, comfortable, and composed—ideal for moments that call for quiet statement dressing.`,
        luxury: `The luxury of rhinestone velvet lies in its restraint. The embellishment is measured, the texture is rich, and the overall feel remains refined. It catches light softly rather than loudly, creating elegance that feels intentional and controlled. This is quiet luxury with depth—designed to feel special without losing DELAN’s signature sense of ease.`,
      },
      {
        id: "linen-silk-satin",
        name: "Linen Silk Satin",
        tags: ["linen", "silk", "satin", "breathable", "sheen"],
        why: `We chose linen silk satin to bring together the best of contrast—natural texture and refined sheen. Linen adds breathability and ease, while silk satin lends softness and fluidity. For DELAN, this blend allows us to create garments that feel relaxed yet elevated, structured yet gentle. It’s a fabric that reflects our belief in balance over excess.`,
        does: `This fabric feels light and comfortable on the skin while offering a smooth, graceful fall. The linen content allows airflow and freshness, while the silk satin finish adds softness and a subtle sheen. The result is a garment that feels breathable, elegant, and easy to wear through long hours without losing its refined appearance.`,
        luxury: `The luxury of linen silk satin lies in its harmony. The texture is calm, the shine is restrained, and the movement is fluid. It doesn’t feel overly polished or overly casual—it sits comfortably in between. This is quiet luxury defined by balance, where natural comfort and refined elegance coexist seamlessly, in true DELAN fashion.`,
      },
      {
        id: "vegan-leather",
        name: "Vegan Leather",
        tags: ["vegan-leather", "structured", "modern", "polished", "edge"],
        why: `We chose vegan leather to offer the look and structure of leather with a more conscious approach. It allows us to create clean, defined silhouettes while staying aligned with modern values and everyday comfort. For DELAN, this fabric is about intention—design that feels considered, wearable, and relevant to how women dress today.`,
        does: `Vegan leather offers structure and shape without feeling heavy or restrictive. It feels smooth to the touch, holds its form well, and adds a refined edge to any silhouette. Designed for comfort as much as appearance, it allows movement while maintaining a polished, contemporary look.`,
        luxury: `The luxury of vegan leather lies in its restraint and finish. It doesn’t try to imitate excess—it focuses on clean lines, controlled texture, and modern elegance. The result is a confident, understated statement that feels intentional rather than trend-driven. This is quiet luxury with a conscious perspective, thoughtfully designed in the DELAN way.`,
      },
      {
        id: "crepe-lycra-twill",
        name: "Crepe Lycra Twill",
        tags: ["crepe", "twill", "stretch", "anti-crease", "everyday"],
        why: `We chose crepe lycra twill for its flexibility and refined structure. It combines the textured finish of crepe with the strength of a twill weave and just enough stretch to support natural movement. For DELAN, this fabric allows silhouettes to feel comfortable without losing shape—designed for ease that doesn’t look casual.`,
        does: `This fabric feels soft yet supportive on the body. The added lycra provides gentle stretch, making movement effortless throughout the day, while the twill weave helps the garment hold its form. It resists creasing, adapts to the body, and remains comfortable over long hours of wear.`,
        luxury: `The luxury of crepe lycra twill lies in how it performs. It stretches subtly, recovers beautifully, and always returns to shape. There is no visible effort—only comfort that feels controlled and intentional. This is quiet luxury built into functionality, where ease, structure, and refinement exist together, true to DELAN’s philosophy.`,
      },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-white">
      {/* HERO */}
      <section className="px-4 pt-16 md:pt-24 pb-10">
        <div className="w-full max-w-5xl mx-auto">
          <h1 className="cormorant-garamond-700 text-primary text-3xl md:text-4xl lg:text-5xl uppercase text-center">
            Delan Fabrics — Premium Materials &amp; Fabric Care Guide
          </h1>

          {/* ✅ Expanded first paragraph (as you asked) */}
          <p className="montserrat-500 text-gray-700 text-center mt-4 leading-relaxed max-w-3xl mx-auto text-justify">
            DELAN pieces begin with how a fabric feels in real life—breathable on the skin, easy to
            move in, and refined without being loud. This page is a simple guide to the fabrics we
            use and what they mean for you. Open any fabric below to read three clear sections:
            <span className="text-primary/90"> why DELAN chose it</span>, what it does for comfort and
            wear, and the quiet luxury behind its texture, drape, and finish—{" "}
            <span className="text-primary/90">FOR THE MOMENTS THAT MATTER.</span>
          </p>

          <p className="montserrat-500 text-gray-700 text-center mt-4 leading-relaxed max-w-3xl mx-auto text-justify">
            Every fabric is chosen with the same care that defines DELAN: thoughtfully{" "}
            <span className="font-semibold text-primary/90">made in India</span>, shaped to{" "}
            <span className="font-semibold text-primary/90">fit the Indian body</span>, and backed by{" "}
            <span className="font-semibold text-primary/90">25 years of excellence</span>. We design
            for real wardrobes too, with{" "}
            <span className="font-semibold text-primary/90">shipping across India</span> and a clear{" "}
            <span className="font-semibold text-primary/90">7 day return/exchange</span> promise.
          </p>

          <div className="relative mt-8 rounded-2xl overflow-hidden ring-1 ring-black/5 h-[260px] md:h-[380px]">
            <Image src={HERO_IMG} alt="DELAN editorial" fill className="object-cover" priority />
          </div>

          <p className="montserrat-500 text-xs text-gray-500 mt-2 text-center">
            FOR THE MOMENTS THAT MATTER
          </p>

        </div>
      </section>

      {/* CONTENT */}
      <section className="px-4 pb-16">
        <div className="w-full max-w-4xl mx-auto montserrat-500">
          <div className="p-0 md:p-2">
            <h2 className={headingStyle}>Fabric Library</h2>
            <p className={paragraphStyle}>
              Tap a fabric name to open the details. Everything is written in a straightforward way
              so you can understand it easily, even if you’re not familiar with fabric terms.
            </p>

            {/* Simple list using native details/summary (clean + familiar) */}
            <div className="mt-6 space-y-3">
              {FABRICS.map((f) => (
                <details
                  key={f.id}
                  className="group rounded-2xl ring-1 ring-black/5 bg-white overflow-hidden"
                >
                  <summary className="cursor-pointer list-none p-4 md:p-5 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg md:text-xl font-semibold text-primary/90">{f.name}</h3>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {f.tags.slice(0, 4).map((t) => (
                          <span
                            key={t}
                            className="text-[11px] px-2 py-1 rounded-full bg-black/[0.03] text-gray-600 ring-1 ring-black/5"
                          >
                            {t.replaceAll("-", " ")}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* simple arrow (minimal) */}
                    <span
                      className="mt-1 inline-flex items-center justify-center w-9 h-9 rounded-full ring-1 ring-black/10 text-gray-600 transition-transform duration-200 group-open:rotate-180"
                      aria-hidden="true"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M6 9l6 6 6-6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </summary>

                  <div className="px-4 md:px-5 pb-5">
                    <div className="h-px bg-black/5 mb-4" />

                    <h4 className="text-sm font-semibold text-primary/90 mb-2">
                      Why DELAN chose {f.name}
                    </h4>
                    <p className={paragraphStyle}>{f.why}</p>

                    <h4 className="text-sm font-semibold text-primary/90 mb-2 mt-6">
                      What {f.name} does for you
                    </h4>
                    <p className={paragraphStyle}>{f.does}</p>

                    <h4 className="text-sm font-semibold text-primary/90 mb-2 mt-6">
                      The quiet luxury of {f.name}
                    </h4>
                    <p className={paragraphStyle}>{f.luxury}</p>
                  </div>
                </details>
              ))}
            </div>

            <h2 className={headingStyle}>Our fabric promise</h2>
            <p className={paragraphStyle}>
              DELAN chooses fabrics with intention—so your wardrobe feels premium, comfortable, and
              easy to live in. We focus on breathability, movement, and a polished finish that
              doesn’t require effort.
            </p>
            <p className="text-gray-700 leading-snug text-justify">
              Made in India, designed for the Indian body, shipped across India, and supported by a
              simple 7 day return/exchange promise. For the moments that matter.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Fabrics;
