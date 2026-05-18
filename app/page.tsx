"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { m, LazyMotion, domAnimation, type Variants } from "framer-motion";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const fadeIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" } },
};

const features = [
  { icon: "📋", label: "Daily Site Reports" },
  { icon: "📸", label: "Photo & Annotations" },
  { icon: "🤖", label: "AI-Powered Summary" },
  { icon: "📄", label: "PDF Generation" },
];

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // Smart redirect — if already logged in, go straight to projects
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/projects");
      } else {
        setChecking(false);
      }
    });
  }, []);

  // Show nothing while checking session — avoid flash
  if (checking) {
    return (
      <div className="min-h-screen bg-blue-900 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <LazyMotion features={domAnimation}>
      <main className="min-h-screen bg-blue-900 flex flex-col">

        {/* Safe area */}
        <div className="h-[env(safe-area-inset-top)]" />

        {/* HERO SECTION */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <m.div
            className="max-w-sm w-full text-center"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {/* Logo */}
            <m.div className="flex justify-center mb-8" variants={fadeIn}>
              <div className="w-24 h-24 rounded-3xl shadow-2xl overflow-hidden border-2 border-white/20">
                <Image
                  src="/logs.png"
                  alt="SiteDiary2U"
                  width={96}
                  height={96}
                  priority
                  className="w-full h-full object-cover"
                />
              </div>
            </m.div>

            {/* Title */}
            <m.div variants={fadeUp} className="mb-2">
              <span className="text-[10px] font-bold tracking-widest text-blue-300 uppercase">
                Construction & Maintenance
              </span>
            </m.div>
            <m.h1
              className="text-4xl font-bold text-white tracking-tight mb-3"
              variants={fadeUp}
            >
              SiteDiary2U
            </m.h1>
            <m.p
              className="text-blue-200 text-base leading-relaxed mb-10 opacity-90"
              variants={fadeUp}
            >
              Professional daily site reporting for construction, renovation & maintenance projects.
            </m.p>

            {/* Feature pills */}


            {/* CTA Buttons */}
            <m.div className="space-y-3" variants={fadeUp}>
              <Link
                href="/login"
                className="block w-full py-3.5 bg-white text-blue-900 font-bold text-sm rounded-xl shadow-lg active:scale-[0.98] transition text-center"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="block w-full py-3.5 bg-white/10 border border-white/20 text-white font-bold text-sm rounded-xl active:scale-[0.98] transition text-center hover:bg-white/15"
              >
                Create Account
              </Link>
            </m.div>
          </m.div>
        </div>

        {/* FOOTER */}
        <m.div
          className="text-center pb-8 px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
        >
          <p className="text-xs text-blue-400">
            © {new Date().getFullYear()} SiteDiary2U · Built for Malaysian contractors
          </p>
        </m.div>

        {/* Safe area bottom */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </main>
    </LazyMotion>
  );
}