import { Brain, Camera, Bell, FileText } from "lucide-react";
import { motion } from "framer-motion";
import TiltCard from "./TiltCard";

const features = [
  { icon: Brain, title: "AI Similarity Detection", desc: "Advanced NLP and image hashing to detect even paraphrased or cropped content across platforms." },
  { icon: Camera, title: "Screenshot Detection", desc: "Detect screen captures and re-uploads of your visual course materials automatically." },
  { icon: Bell, title: "Real-time Alerts", desc: "Get notified instantly when new matches are found, so you can act before content spreads." },
  { icon: FileText, title: "Legal Evidence Reports", desc: "Generate court-ready reports with timestamps, screenshots, and similarity scores." },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="landing-display text-4xl md:text-5xl font-bold text-center mb-4"
        >
          Everything you need to <span className="text-gradient-teal">protect your content</span>
        </motion.h2>
        <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-16">
          Powerful tools designed to detect, monitor, and report unauthorized usage of your educational materials.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <TiltCard className="rounded-xl border border-border bg-card p-8 hover:border-primary/40 group">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="w-5 h-5 text-primary group-hover:drop-shadow-[0_0_6px_hsl(175_72%_46%_/_0.6)] transition-all" />
                </div>
                <h3 className="landing-display font-bold text-lg text-foreground mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
