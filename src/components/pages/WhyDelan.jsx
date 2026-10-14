'use client';
import React from "react";
import Image from "next/image";

const WhyDelan = () => {
  const headingStyle = "text-2xl font-semibold text-primary/90 mt-10 mb-4";
  const paragraphStyle = "text-gray-700 mb-4 leading-relaxed text-justify";

  const HERO_IMG =
    // "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/1_3e619d1a-2e65-4b31-9ded-a944917f6575.jpg?v=1767809801";
    "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/master_header.jpg?v=1767810230";

  const BTS_IMG =
    // "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/About2nd.jpg?v=1767803017";
    // "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/jjbk.jpg?v=1767810455";
    "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/DSC00320_copy.jpg?v=1767810758"

  const GRID_1 =
    "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/Untitled_design_11.png?v=1767809571";
  const GRID_2 =
    "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/WhatsApp_Image_2026-01-07_at_11.08.43_PM.jpg?v=1767807666";
  const GRID_3 =
    "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/WhatsApp_Image_2026-01-07_at_11.08.45_PM.jpg?v=1767807667";
  const GRID_4 =
    "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/WhatsApp_Image_2026-01-07_at_11.08.44_PM.jpg?v=1767807667";

  const CONFIDENCE_IMG =
    "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/2_461399d6-0357-40cd-b7a6-b32a8e45ea1c.jpg?v=1767807981";

  const COMFORT_IMG =
    "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/3_7322afb9-2c12-4970-b71f-51cff1e11f1b.jpg?v=1767807981";

  return (
    <div className="min-h-screen bg-white">
      <section className="px-4 pt-16 md:pt-24 pb-4">
        <div className="w-full max-w-5xl mx-auto">
          <h1 className="cormorant-garamond-700 text-primary text-3xl md:text-4xl lg:text-5xl uppercase text-center">
            Why Choose Delan — Premium Women&apos;s Fashion India
          </h1>

          <p className="montserrat-500 text-gray-700 text-center mt-4 leading-relaxed max-w-3xl mx-auto text-justify">
            DELAN is premium women’s western wear created for everyday elegance.
            We focus on refined silhouettes, a breathable wearing experience,
            and quality finishing so your outfits feel comfortable, look
            polished, and stay reliable over time.
          </p>

          <div className="relative mt-8 rounded-2xl overflow-hidden ring-1 ring-black/5 h-[260px] md:h-[380px]">
            <Image
              src={HERO_IMG}
              alt="Why DELAN premium women’s western wear master header image"
              fill
              className="object-cover object-bottom"
              priority
            />
          </div>

          <p className="montserrat-500 text-xs text-gray-500 mt-2 text-center">
            FOR THE MOMENTS THAT MATTER
          </p>
        </div>
      </section>

      <section className="px-4 pb-16">
        <div className="w-full max-w-4xl mx-auto montserrat-500">
          <div className="p-6 md:p-10">
            <h2 className={headingStyle}>Our Purpose</h2>
            <p className={paragraphStyle}>
              DELAN exists for women who want fashion that feels as good as it
              looks. Premium clothing should never feel difficult to wear. It
              should sit softly on the skin, feel light through long hours, and
              look clean even after repeated wear. That is the standard we
              design around, because comfort and quality are not extras, they
              are the foundation.
            </p>
            <p className={paragraphStyle}>
              We create modern luxury clothing that fits into real life. Whether
              you are dressing for work, travel, weekends, or celebrations, the
              pieces should feel effortless. The confidence comes from knowing
              you look polished, and from knowing the outfit will support you
              through the day, not distract you.
            </p>

            <h2 className={headingStyle}>Comfort First, Always</h2>
            <p className={paragraphStyle}>
              The first thing you notice about a truly premium outfit is the
              feel. DELAN is made for a comfortable-on-skin experience so you
              can wear your pieces longer and move freely. When clothing feels
              right, styling becomes easy, and the outfit starts to feel like
              part of you.
            </p>

            <div className="relative mt-6 rounded-2xl overflow-hidden ring-1 ring-black/5 aspect-[2560/1707]">
              <Image src={COMFORT_IMG} alt="DELAN comfort on skin premium women’s wear" fill className="object-cover" />
            </div>

            <h2 className={headingStyle}>A Breathable, Natural Feel</h2>
            <p className={paragraphStyle}>
              We prioritize a breathable wearing experience because everyday
              luxury should feel light, not heavy. The fabric should allow
              comfort across hours, seasons, and plans, while still holding a
              refined, premium look. This balance of ease and elegance is what
              makes DELAN a wardrobe you return to.
            </p>

            <div className="mt-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div className="relative rounded-xl overflow-hidden ring-1 ring-black/5 h-[260px] md:h-[320px]">
                  <Image src={GRID_1} alt="DELAN premium women’s western wear portrait image 1" fill className="object-cover object-center" />
                </div>

                <div className="relative rounded-xl overflow-hidden ring-1 ring-black/5 h-[260px] md:h-[320px]">
                  <Image src={GRID_2} alt="DELAN modern women’s western wear portrait image 2" fill className="object-cover object-center" />
                </div>

                <div className="relative rounded-xl overflow-hidden ring-1 ring-black/5 h-[260px] md:h-[320px]">
                  <Image src={GRID_3} alt="DELAN breathable premium outfit portrait image 3" fill className="object-cover object-center" />
                </div>

                <div className="relative rounded-xl overflow-hidden ring-1 ring-black/5 h-[260px] md:h-[320px]">
                  <Image src={GRID_4} alt="DELAN refined silhouettes portrait image 4" fill className="object-cover object-center" />
                </div>
              </div>
            </div>

            <h2 className={headingStyle}>Clean Finishing That Holds Up</h2>
            <p className={paragraphStyle}>
              Finishing is what turns a good piece into a dependable one. DELAN
              focuses on clean construction and a polished look that stays
              intact. The goal is simple: pieces that keep their shape, look
              refined, and remain wearable season after season, so your wardrobe
              feels consistent and elevated.
            </p>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="relative rounded-2xl overflow-hidden ring-1 ring-black/5 h-[260px] md:h-[320px]">
                <Image src={BTS_IMG} alt="DELAN behind the scenes craftsmanship" fill className="object-cover" />
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-primary/90 mb-3">
                  Made to be worn again and again
                </h2>
                <p className={paragraphStyle}>
                  DELAN is designed for repeat wear because that is what real
                  premium looks like in everyday life. Pieces should be easy to
                  style, comfortable to carry through long hours, and refined
                  enough to feel right in any setting. When your wardrobe works
                  this way, getting dressed becomes simple, and confidence
                  becomes effortless.
                </p>
                <p className="text-gray-700 leading-relaxed text-justify">
                  If you are searching for premium women’s western wear that
                  blends comfort, breathable feel, and lasting finish, DELAN is
                  made for you.
                </p>
              </div>
            </div>

            <h2 className={headingStyle}>Everyday Luxury, Done Right</h2>

            <div className="relative mt-6 rounded-2xl overflow-hidden ring-1 ring-black/5 aspect-video">
              <Image src={CONFIDENCE_IMG} alt="DELAN premium women’s western wear confidence image" fill className="object-cover" />
            </div>

            <p className={`${paragraphStyle} mt-6`}>
              DELAN brings together modern design and everyday comfort in a way
              that feels truly wearable. It is luxury you can live in,
              silhouettes you can repeat, and quality you can trust. That is the
              purpose behind DELAN, and that is what makes it different.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default WhyDelan;
