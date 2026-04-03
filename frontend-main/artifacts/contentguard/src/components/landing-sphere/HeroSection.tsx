import { Shield, Play } from "lucide-react";
import { motion } from "framer-motion";

const HeroSection = () => {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="flex items-center gap-2 px-4 py-2 rounded-full border border-border mb-8"
      >
        <Shield className="w-4 h-4 text-primary" />
        <span className="text-sm text-muted-foreground">AI-Powered Content Protection</span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.1 }}
        className="landing-display text-4xl md:text-6xl lg:text-7xl font-bold text-center max-w-4xl leading-tight mb-6"
      >
        Detect Stolen Educational Content{" "}
        <span className="text-gradient-teal">Across the Internet</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="text-muted-foreground text-center max-w-2xl text-lg mb-10"
      >
        Upload your course material and instantly find where it&apos;s being used without permission. Protect your intellectual property with AI.
      </motion.p>

      <motion.a
        href="#demo"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        whileHover={{
          scale: 1.05,
          boxShadow: "0 0 25px hsl(175 72% 46% / 0.5), 0 0 60px hsl(175 72% 46% / 0.2)",
        }}
        whileTap={{ scale: 0.97 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="flex items-center gap-2 px-8 py-3.5 rounded-full font-semibold text-primary-foreground transition-colors"
        style={{
          background: "linear-gradient(135deg, hsl(175, 72%, 46%), hsl(190, 80%, 55%))",
          boxShadow: "0 0 20px hsl(175 72% 46% / 0.3)",
        }}
      >
        <Play className="w-4 h-4" />
        Try Demo
      </motion.a>
    </section>
  );
};

export default HeroSection;
