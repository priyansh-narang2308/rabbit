"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "@studio-freight/lenis";
import Link from "next/link";
import { ArrowRight, Terminal } from "lucide-react";

export function ParallaxComponent() {
  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const triggerElement = parallaxRef.current?.querySelector(
      "[data-parallax-layers]",
    );

    if (triggerElement) {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: triggerElement,
          start: "0% 0%",
          end: "100% 0%",
          scrub: 0,
        },
      });

      const layers = [
        { layer: "1", yPercent: 70 },
        { layer: "2", yPercent: 55 },
        { layer: "3", yPercent: 40 },
        { layer: "4", yPercent: 10 },
      ];

      layers.forEach((layerObj, idx) => {
        tl.to(
          triggerElement.querySelectorAll(
            `[data-parallax-layer="${layerObj.layer}"]`,
          ),
          {
            yPercent: layerObj.yPercent,
            ease: "none",
          },
          idx === 0 ? undefined : "<",
        );
      });
    }

    const lenis = new Lenis();
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    return () => {
      ScrollTrigger.getAll().forEach((st) => st.kill());
      if (triggerElement) gsap.killTweensOf(triggerElement);
      lenis.destroy();
    };
  }, []);

  return (
    <div className="parallax font-sans" ref={parallaxRef}>
      {/* Absolute Navbar for the Demo */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-black/30 backdrop-blur-md">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-3xl tracking-tight text-white font-[family-name:var(--font-caveat)]">
              Rabbit
            </span>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-full bg-white text-black font-medium text-sm hover:bg-gray-200 transition-colors"
          >
            Open Dashboard
          </Link>
        </div>
      </nav>

      <section className="parallax__header">
        <div className="parallax__visuals">
          <div className="parallax__black-line-overflow"></div>
          <div data-parallax-layers className="parallax__layers">
            <img
              src="https://cdn.prod.website-files.com/671752cd4027f01b1b8f1c7f/6717795be09b462b2e8ebf71_osmo-parallax-layer-3.webp"
              loading="eager"
              width="800"
              data-parallax-layer="1"
              alt=""
              className="parallax__layer-img brightness-50"
            />
            <img
              src="https://cdn.prod.website-files.com/671752cd4027f01b1b8f1c7f/6717795b4d5ac529e7d3a562_osmo-parallax-layer-2.webp"
              loading="eager"
              width="800"
              data-parallax-layer="2"
              alt=""
              className="parallax__layer-img opacity-80"
            />

            <div
              data-parallax-layer="3"
              className="parallax__layer-title flex flex-col items-center justify-center"
            >
              <h2 className="parallax__title bg-linear-to-b from-white to-gray-500 text-transparent bg-clip-text font-[family-name:var(--font-caveat)] font-normal tracking-normal lowercase capitalize pr-12">
                Rabbit
              </h2>
            </div>

            <img
              src="https://cdn.prod.website-files.com/671752cd4027f01b1b8f1c7f/6717795bb5aceca85011ad83_osmo-parallax-layer-1.webp"
              loading="eager"
              width="800"
              data-parallax-layer="4"
              alt=""
              className="parallax__layer-img"
            />
          </div>
          <div className="parallax__fade"></div>
        </div>
      </section>

      <section className="parallax__content">
        <div className="max-w-4xl mx-auto text-center relative z-30 pt-32 pb-48">
          <h3 className="text-4xl md:text-6xl font-bold mb-8">
            The Ultimate AI Agent Execution Engine
          </h3>
          <p className="text-xl text-gray-400 mb-12">
            Rabbit orchestrates autonomous browser sessions, executing complex
            workflows with superhuman precision. Real-time auditing, perfect
            sandboxing, zero friction.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black font-semibold hover:scale-105 transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]"
          >
            Enter Dashboard <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
