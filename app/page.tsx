"use client";

import Link from "next/link";
import Image from "next/image";
import { m, LazyMotion, domAnimation, type Variants } from "framer-motion";

// Animation config (clean + reusable)
const container: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: "easeOut",
    },
  },
};

const logo: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  show: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.35,
    },
  },
};

export default function Home() {
  return (
    <LazyMotion features={domAnimation}>
      <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        
        <m.div
          className="max-w-md text-center"
          variants={container}
          initial="hidden"
          animate="show"
        >

          {/* Logo */}
          <m.div
            className="flex justify-center mb-6"
            variants={logo}
          >
            <Image
              src="/lo.png"
              alt="SiteDiary2U Logo"
              width={160}
              height={160}
              priority
            />
          </m.div>

          {/* Title */}
          <m.h1
            className="text-4xl font-bold text-blue-900 mb-4"
            variants={item}
          >
            SiteDiary2U
          </m.h1>

          {/* Description */}
          <m.p
            className="text-gray-600 mb-8"
            variants={item}
          >
            Professional Daily Site Reporting for Construction,
            Renovation & Maintenance Projects.
          </m.p>

          {/* Button */}
          <m.div variants={item}>
            <Link
              href="/projects"
              className="inline-block bg-blue-900 text-white px-6 py-3 rounded-xl shadow-md transition active:scale-95"
            >
              Go to Projects
            </Link>
          </m.div>

        </m.div>

      </main>
    </LazyMotion>
  );
}