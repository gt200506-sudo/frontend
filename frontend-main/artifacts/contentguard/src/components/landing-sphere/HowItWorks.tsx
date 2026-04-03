import { Upload, ScanSearch, Bell } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";

const steps = [
  { icon: Upload, num: 1, title: "Upload Content", desc: "Drop your PDFs, slides, images, or text files into ContentGuard.", btn: "Upload Now", href: "/signin" as const },
  { icon: ScanSearch, num: 2, title: "AI Scans the Web", desc: "Our engine crawls marketplaces, forums, and websites for matches.", btn: "Start Scan", href: "/signin" as const },
  { icon: Bell, num: 3, title: "Get Alerts & Proof", desc: "Receive reports with match percentages, sources, and evidence.", btn: "View Alerts", href: "/signin" as const },
];

const HowItWorks = () => {
  return (
    <section className="py-24 px-4">
      <div className="max-w-5xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="landing-display text-4xl md:text-5xl font-bold mb-3"
        >
          How it <span className="text-gradient-teal">works</span>
        </motion.h2>
        <p className="text-muted-foreground mb-16">Three simple steps to protect your content</p>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="flex flex-col items-center group"
            >
              <div className="relative mb-6">
                <div className="w-16 h-16 rounded-2xl border border-border bg-card flex items-center justify-center group-hover:border-primary/40 group-hover:shadow-[0_0_20px_hsl(175_72%_46%_/_0.15)] transition-all duration-300">
                  <s.icon className="w-7 h-7 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                  {s.num}
                </div>
              </div>
              <h3 className="landing-display font-bold text-lg text-foreground mb-2">{s.title}</h3>
              <p className="text-muted-foreground text-sm max-w-xs mb-5">{s.desc}</p>
              <Link href={s.href}>
                <motion.span
                  whileHover={{
                    scale: 1.08,
                    boxShadow: "0 0 20px hsl(175 72% 46% / 0.5), 0 0 50px hsl(175 72% 46% / 0.2)",
                  }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-block px-6 py-2.5 rounded-full text-sm font-semibold border border-primary/30 text-primary hover:text-primary-foreground hover:border-transparent transition-colors duration-300 cursor-pointer"
                  style={{
                    background: "linear-gradient(135deg, hsl(175 72% 46% / 0.1), hsl(190 80% 55% / 0.05))",
                  }}
                >
                  {s.btn}
                </motion.span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
