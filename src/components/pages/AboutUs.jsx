'use client';
import React from "react";
import Image from "next/image";

const AboutUs = () => {
  const headingStyle = "text-2xl font-semibold text-primary/90 mt-10 mb-4";
  const paragraphStyle = "text-gray-700 mb-4 leading-relaxed text-justify";

  const HERO_IMG =
    "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/DSC00275_copy.jpg?v=1767802538";

  const BTS_IMG =
    "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/About2nd.jpg?v=1767803017";

  const GRID_1 =
    "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/1_04bd322a-e528-4dea-9d8d-de0ba55993c3.jpg?v=1767803941";
  const GRID_2 =
    "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/3_7f223ad0-0ffd-4574-810f-0c5bdd70a775.jpg?v=1767803941";
  const GRID_3 =
    "https://cdn.shopify.com/s/files/1/0714/4420/1639/files/2_a336799a-6b43-4c0f-922c-344e4ab4b099.jpg?v=1767803941";

  return (
    <div className="min-h-screen bg-white">
      <section className="px-4 pt-16 md:pt-24 pb-10">
        <div className="w-full max-w-5xl mx-auto">
          <h1 className="cormorant-garamond-700 text-primary text-3xl md:text-4xl lg:text-5xl uppercase text-center">
            About Us
          </h1>

          <p className="montserrat-500 text-gray-700 text-center mt-4 leading-relaxed max-w-3xl mx-auto text-justify">
            DELAN is a modern luxury label designed for women who value refined silhouettes,
            premium finishing, and effortless confidence. We create pieces you can live in,
            repeat, and remember,{" "}
            <span className="text-primary/90">FOR THE MOMENTS THAT MATTER.</span>
          </p>

          <div className="relative mt-8 rounded-2xl overflow-hidden ring-1 ring-black/5 h-[260px] md:h-[380px]">
            <Image
              src={HERO_IMG}
              alt="DELAN brand editorial"
              fill
              className="object-cover"
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
            <h2 className={headingStyle}>Who We Are</h2>
            <p className={paragraphStyle}>
              DELAN is built on a simple idea: luxury should feel effortless. Not loud. Not
              complicated. Just beautifully made clothing that fits well, feels premium, and
              belongs to real life.
            </p>
            <p className={paragraphStyle}>
              We design for the modern woman who moves through many roles in a single day, work,
              travel, evenings out, celebrations, and everything in between. Our pieces are made
              to look polished without trying too hard, and to feel comfortable long after the
              day ends.
            </p>

            <h2 className={headingStyle}>What We Make</h2>
            <p className={paragraphStyle}>
              Our collections focus on clean silhouettes with an elevated edge, pieces that feel
              refined on camera and even better in person. From statement co-ords to effortless
              dresses, DELAN is made for repeat wear, the kind of wardrobe you can build around,
              style your way, and keep coming back to.
            </p>

            <h2 className={headingStyle}>What We Stand For</h2>
            <p className={paragraphStyle}>
              We pay attention to the details that matter, structure, proportion, finishing, and
              the way a garment moves. Because real premium is not just how it looks online. It is
              how it feels when you wear it, how it holds its shape, and how confidently you carry
              it through your day.
            </p>

            <div className="mt-8">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                <div className="relative rounded-xl overflow-hidden ring-1 ring-black/5 h-[170px] md:h-[220px]">
                  <Image src={GRID_1} alt="DELAN editorial grid 1" fill className="object-cover" />
                </div>

                <div className="relative rounded-xl overflow-hidden ring-1 ring-black/5 h-[170px] md:h-[220px]">
                  <Image src={GRID_2} alt="DELAN editorial grid 2" fill className="object-cover" />
                </div>

                <div className="relative rounded-xl overflow-hidden ring-1 ring-black/5 md:block col-span-2 md:col-span-1 h-[170px] md:h-[220px]">
                  <Image src={GRID_3} alt="DELAN editorial grid 3" fill className="object-cover" />
                </div>
              </div>
            </div>

            <h2 className={headingStyle}>The DELAN Woman</h2>
            <p className={paragraphStyle}>
              She is confident, composed, and intentional. She values quality over clutter and
              chooses pieces that support her lifestyle, not just a single occasion. She does not
              chase trends; she builds a wardrobe that lasts, and she wears it with quiet power.
            </p>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="relative rounded-2xl overflow-hidden ring-1 ring-black/5 h-[260px] md:h-[320px]">
                <Image src={BTS_IMG} alt="DELAN behind the scenes" fill className="object-cover" />
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-primary/90 mb-3">
                  Behind DELAN
                </h2>
                <p className={paragraphStyle}>
                  Everything we create begins with intention, clean lines, premium feel, and a fit
                  that looks effortless in real life. We design pieces that you will wear again and
                  again, because the most meaningful outfits are not the ones you save, they are the
                  ones you live in.
                </p>
                <p className="text-gray-700 leading-relaxed text-justify">
                  Welcome to <strong>DELAN</strong>. For the moments that matter.
                </p>
              </div>
            </div>

            <h2 className={headingStyle}>Looking Ahead</h2>
            <p className={paragraphStyle}>
              DELAN is growing into a complete world of modern luxury, timeless silhouettes,
              premium craftsmanship, and collections that stay relevant season after season. We are
              here to create clothing that feels personal, elevated, and lasting, pieces you will
              remember wearing.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutUs;
