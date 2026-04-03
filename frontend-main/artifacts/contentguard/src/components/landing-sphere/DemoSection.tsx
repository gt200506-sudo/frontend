import { useState, useEffect, useCallback } from "react";
import { Upload, ExternalLink, AlertTriangle, X, Download, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type DemoState = "upload" | "scanning" | "results";

const scanSteps = [
  "Analyzing document structure...",
  "Extracting text fingerprints...",
  "Generating image hashes...",
  "Cross-referencing image hashes...",
  "Searching web databases...",
  "Scanning Telegram channels...",
  "Compiling results...",
];

const results = [
  { url: "freecoursedump.net/ai-101", source: "Web Search", match: 94, excerpt: '"Chapter 3: Neural Networks — Deep Learning Fundamentals..."' },
  { url: "leakedcourses.org/ml-bootcamp", source: "Web Search", match: 87, excerpt: '"Module 5 slides reproduced with minor edits..."' },
  { url: "piratedlearning.com/quiz-bank", source: "Web Search", match: 72, excerpt: '"Quiz bank — 45 questions matched from original..."' },
];

const DemoSection = () => {
  const [state, setState] = useState<DemoState>("upload");
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);

  const startScan = useCallback(() => {
    setState("scanning");
    setProgress(0);
    setStepIndex(0);
  }, []);

  useEffect(() => {
    if (state !== "scanning") return;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setState("results");
          return 100;
        }
        return p + 1;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [state]);

  useEffect(() => {
    if (state !== "scanning") return;
    const idx = Math.min(Math.floor(progress / (100 / scanSteps.length)), scanSteps.length - 1);
    setStepIndex(idx);
  }, [progress, state]);

  const reset = () => {
    setState("upload");
    setProgress(0);
    setStepIndex(0);
  };

  return (
    <section id="demo" className="py-24 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="landing-display text-4xl md:text-5xl font-bold mb-3"
        >
          See it <span className="text-gradient-teal">in action</span>
        </motion.h2>
        <p className="text-muted-foreground mb-12">Try our interactive demo — no account needed</p>

        <div className="rounded-2xl border border-border bg-card p-8">
          <AnimatePresence mode="wait">
            {state === "upload" && (
              <motion.div
                key="upload"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="border-2 border-dashed border-primary/30 rounded-xl p-12 flex flex-col items-center"
              >
                <Upload className="w-10 h-10 text-primary mb-4" />
                <p className="font-semibold text-foreground mb-1">Drag & drop your content here</p>
                <p className="text-muted-foreground text-sm mb-6">Supports PDF, DOCX, Images, Text</p>
                <button
                  type="button"
                  onClick={startScan}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm text-primary-foreground transition-opacity hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, hsl(175, 72%, 46%), hsl(190, 80%, 55%))" }}
                >
                  <Upload className="w-4 h-4" />
                  Select File
                </button>
              </motion.div>
            )}

            {state === "scanning" && (
              <motion.div
                key="scanning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center py-12"
              >
                <div className="relative w-24 h-24 mb-8">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                    <circle cx="48" cy="48" r="42" stroke="hsl(210, 18%, 18%)" strokeWidth="3" fill="none" />
                    <circle
                      cx="48"
                      cy="48"
                      r="42"
                      stroke="hsl(175, 72%, 46%)"
                      strokeWidth="3"
                      fill="none"
                      strokeDasharray={264}
                      strokeDashoffset={264 - (264 * progress) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-100"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-1 h-8 bg-primary/60 rounded-full animate-pulse" />
                  </div>
                </div>
                <p className="font-semibold text-foreground mb-2">Scanning in progress...</p>
                <p className="text-primary text-sm mb-6">{scanSteps[stepIndex]}</p>
                <div className="w-80 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-100"
                    style={{
                      width: `${progress}%`,
                      background: "linear-gradient(90deg, hsl(175, 72%, 46%), hsl(200, 80%, 55%))",
                    }}
                  />
                </div>
                <p className="text-muted-foreground text-sm mt-2">{progress}%</p>
              </motion.div>
            )}

            {state === "results" && (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <span className="text-amber-400 font-semibold">3 Matches</span>
                    <span className="font-bold text-foreground">Found</span>
                  </div>
                  <button type="button" onClick={reset} className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm">
                    <X className="w-4 h-4" /> Reset
                  </button>
                </div>

                <div className="space-y-4">
                  {results.map((r, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.15 }}
                      className="rounded-xl border border-border bg-secondary/30 p-5 text-left"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold text-foreground text-sm">{r.url}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{r.source}</span>
                        </div>
                        <span className="text-destructive font-bold text-sm">{r.match}% Match</span>
                      </div>
                      <div className="border-l-2 border-border pl-3 mt-3">
                        <p className="text-muted-foreground text-sm italic">{r.excerpt}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="flex items-center justify-center gap-4 mt-8">
                  <button
                    type="button"
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm text-primary-foreground"
                    style={{ background: "linear-gradient(135deg, hsl(175, 72%, 46%), hsl(190, 80%, 55%))" }}
                  >
                    <Download className="w-4 h-4" />
                    Download Proof Report
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm border border-border text-foreground hover:bg-secondary transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Scan Another File
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default DemoSection;
