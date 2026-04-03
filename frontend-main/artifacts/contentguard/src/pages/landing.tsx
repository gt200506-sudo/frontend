import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import ContentGuardIntro from "@/components/landing-sphere/ContentGuardIntro";
import GlassCursor from "@/components/landing-sphere/GlassCursor";
import LandingNavbar from "@/components/landing-sphere/LandingNavbar";
import HeroSection from "@/components/landing-sphere/HeroSection";
import CrisisSection from "@/components/landing-sphere/CrisisSection";
import DemoSection from "@/components/landing-sphere/DemoSection";
import HowItWorks from "@/components/landing-sphere/HowItWorks";
import FeaturesSection from "@/components/landing-sphere/FeaturesSection";
import CTASection from "@/components/landing-sphere/CTASection";

/** Marketing landing (public); default route `/` for guests. */
export default function LandingPage() {
  const [showIntro, setShowIntro] = useState(true);

  return (
    <div className="cursor-none min-h-screen bg-background">
      <GlassCursor />

      <AnimatePresence mode="wait">
        {showIntro && (
          <motion.div
            key="intro"
            exit={{ opacity: 0, scale: 1.08, filter: "blur(10px)" }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <ContentGuardIntro onExplore={() => setShowIntro(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!showIntro && (
          <motion.div
            key="landing"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <LandingNavbar />
            <main className="overflow-hidden">
              <HeroSection />
              <CrisisSection />
              <DemoSection />
              <HowItWorks />
              <FeaturesSection />
              <CTASection />
            </main>
            <footer className="border-t border-border py-8 text-center text-muted-foreground text-sm">
              <p className="mb-2">© {new Date().getFullYear()} ContentGuard. All rights reserved.</p>
              <Link href="/signin" className="text-primary hover:underline text-xs">
                Sign in to dashboard
              </Link>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
