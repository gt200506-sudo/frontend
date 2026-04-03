import { Shield } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";

const CTASection = () => {
  return (
    <section className="py-24 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex justify-center mb-6"
        >
          <div className="w-14 h-14 rounded-2xl border border-border bg-card flex items-center justify-center">
            <Shield className="w-7 h-7 text-primary" />
          </div>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="landing-display text-4xl md:text-5xl font-bold mb-4"
        >
          Protect Your Content
          <br />
          <span className="text-gradient-teal">Before It&apos;s Too Late</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground mb-10 max-w-lg mx-auto"
        >
          Join educators and institutions safeguarding intellectual property with ContentGuard.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <Link href="/signin">
            <span
              className="inline-block px-8 py-3.5 rounded-full font-semibold text-primary-foreground transition-colors cursor-pointer"
              style={{
                background: "linear-gradient(135deg, hsl(175, 72%, 46%), hsl(190, 80%, 55%))",
                boxShadow: "0 0 20px hsl(175 72% 46% / 0.3)",
              }}
            >
              Start Protecting Now
            </span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
