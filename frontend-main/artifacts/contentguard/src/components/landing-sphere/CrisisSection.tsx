import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

const stats = [
  { value: "85%", label: "of online course creators have experienced content theft" },
  { value: "$12B", label: "lost annually to educational content piracy worldwide" },
  { value: "3,000+", label: "Telegram channels distributing pirated courses right now" },
];

const CrisisSection = () => {
  return (
    <section className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="landing-display text-4xl md:text-5xl font-bold text-center mb-4"
        >
          The <span className="text-destructive">silent crisis</span> in education
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground text-center max-w-2xl mx-auto mb-16"
        >
          Every day, thousands of hours of educational content are stolen and redistributed without permission.
        </motion.p>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            {stats.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * i }}
                className="flex items-baseline gap-4"
              >
                <span className="text-3xl md:text-4xl font-bold text-primary landing-display">{s.value}</span>
                <span className="text-muted-foreground text-sm">{s.label}</span>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-border bg-card p-6 space-y-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">TG</div>
              <div>
                <span className="font-semibold text-foreground text-sm">Leaked Courses Hub</span>
                <span className="text-muted-foreground text-xs ml-2">• 24.5k members</span>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">📦 [NEW] Complete AI & ML Course 2024 — FREE download</p>
              <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="text-destructive font-medium text-xs">Your Content Detected Here</span>
              </div>
              <p className="text-muted-foreground">🍊 Premium Data Science Bootcamp — all modules</p>
              <p className="text-muted-foreground">🔥 $499 course for FREE — grab before taken down</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CrisisSection;
