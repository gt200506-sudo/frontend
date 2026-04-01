import { useState } from "react";
import { useListDetections, useUpdateDetectionStatus } from "@workspace/api-client-react";
import type { ListDetectionsStatus, UpdateDetectionStatusRequestStatus } from "@workspace/api-client-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertTriangle, ExternalLink, Shield, Brain, Eye, FileSearch, Globe, Share2, GitBranch } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

const AI_METHOD_MAP: Record<string, { label: string; icon: typeof Brain; color: string }> = {
  visual: { label: "Computer Vision", icon: Eye, color: "text-pink-400 bg-pink-500/10 border-pink-500/20" },
  text: { label: "NLP Analysis", icon: Brain, color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
  partial: { label: "Text Similarity", icon: FileSearch, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
};

const PLATFORM_SCAN_SOURCES = [
  { value: "all", label: "All Sources", icon: Shield },
  { value: "websites", label: "Websites", icon: Globe },
  { value: "social", label: "Social Media", icon: Share2 },
  { value: "repositories", label: "Repositories", icon: GitBranch },
];

export default function Detections() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<ListDetectionsStatus | "all">("all");
  const [platformFilter, setPlatformFilter] = useState("all");

  const { data, isLoading } = useListDetections({
    limit: 50,
    ...(filter !== "all" ? { status: filter } : {})
  });

  const { mutate: updateStatus } = useUpdateDetectionStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/detections"] });
      }
    }
  });

  const getScoreColor = (score: number) => {
    if (score > 0.9) return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    if (score > 0.7) return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  };

  const getAiMethod = (detectionType: string) => {
    return AI_METHOD_MAP[detectionType] || { label: "AI Scan", icon: Brain, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
  };

  const platformKeywords: Record<string, string[]> = {
    websites: ["Medium", "Academia", "ResearchGate", "SlideShare", "Scribd"],
    social: ["Twitter/X", "Reddit", "Telegram", "Discord"],
    repositories: ["GitHub"],
  };

  const filteredItems = (data?.items || []).filter(detection => {
    if (platformFilter === "all") return true;
    const keywords = platformKeywords[platformFilter] || [];
    return keywords.some(k => detection.sourcePlatform?.includes(k));
  });

  const handleStatusUpdate = (id: string, status: UpdateDetectionStatusRequestStatus) => {
    updateStatus({ id, data: { status } });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-gradient mb-2">Infringement Detections</h1>
        <p className="text-muted-foreground">AI-powered scan results across websites, social platforms, and public repositories.</p>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {["all", "pending", "confirmed", "dismissed"].map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f as any)}
            className={filter === f ? "shadow-lg shadow-primary/20" : "bg-background/50"}
          >
            <span className="capitalize">{f}</span>
          </Button>
        ))}
      </div>

      {/* Platform Source Filter */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-muted-foreground self-center mr-2 uppercase tracking-wider">Scan Source:</span>
        {PLATFORM_SCAN_SOURCES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setPlatformFilter(value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              platformFilter === value
                ? "bg-primary/15 text-primary border-primary/40"
                : "bg-white/[0.02] text-muted-foreground border-border/40 hover:bg-white/[0.04]"
            }`}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          Array(5).fill(0).map((_, i) => (
            <Card key={i} className="glass-panel p-6 animate-pulse">
              <div className="h-6 w-1/3 bg-white/10 rounded mb-4"></div>
              <div className="h-4 w-1/2 bg-white/10 rounded"></div>
            </Card>
          ))
        ) : filteredItems.length ? (
          filteredItems.map((detection) => {
            const aiMethod = getAiMethod(detection.detectionType);
            const AiIcon = aiMethod.icon;
            return (
              <Card key={detection.id} className="glass-panel overflow-hidden">
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row justify-between gap-6">
                    <div className="space-y-4 flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge variant="outline" className={getScoreColor(detection.similarityScore)}>
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {(detection.similarityScore * 100).toFixed(1)}% Match
                            </Badge>
                            <Badge variant="outline" className={`text-xs ${aiMethod.color}`}>
                              <AiIcon className="w-3 h-3 mr-1" />
                              {aiMethod.label}
                            </Badge>
                            <Badge variant="outline" className="bg-white/5 uppercase text-xs">
                              {detection.detectionType}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Detected {format(new Date(detection.detectedAt), "MMM d, yyyy HH:mm")}
                            </span>
                          </div>
                          <h3 className="text-xl font-bold font-display">{detection.contentTitle}</h3>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-black/20 border border-border/40 font-mono text-sm text-muted-foreground relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-rose-500/50 rounded-l-xl"></div>
                        "{detection.excerpt}"
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Source:</span>
                        <Badge variant="secondary" className="bg-secondary">{detection.sourcePlatform}</Badge>
                        <a href={detection.sourceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                          {detection.sourceUrl} <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    <div className="flex lg:flex-col items-center lg:items-end justify-center gap-3 lg:border-l border-border/40 lg:pl-6 min-w-[140px]">
                      {detection.status === "pending" ? (
                        <>
                          <Button
                            className="w-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 hover:text-emerald-300 border border-emerald-500/30"
                            onClick={() => handleStatusUpdate(detection.id, "confirmed")}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Confirm
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full border-border/50 hover:bg-white/5"
                            onClick={() => handleStatusUpdate(detection.id, "dismissed")}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Dismiss
                          </Button>
                        </>
                      ) : (
                        <div className="text-center">
                          <Badge variant="outline" className={
                            detection.status === "confirmed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 py-1.5 px-3" : "bg-slate-500/10 text-slate-400 border-slate-500/30 py-1.5 px-3"
                          }>
                            {detection.status === "confirmed" ? <CheckCircle className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                            <span className="capitalize">{detection.status}</span>
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <Card className="glass-panel p-12 text-center text-muted-foreground flex flex-col items-center">
            <Shield className="w-16 h-16 opacity-20 mb-4" />
            <p className="text-lg">No detections found for the selected filters.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
