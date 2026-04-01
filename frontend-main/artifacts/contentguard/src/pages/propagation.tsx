import { useGetPropagationData } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Network, Github, Globe, MessageCircle, Send, BookOpen, Search, Layers, Book, AtSign } from "lucide-react";
import RadialOrbitalTimeline from "@/components/ui/radial-orbital-timeline";
import type { TimelineItem } from "@/components/ui/radial-orbital-timeline";

function getPlatformIcon(platform: string): React.ElementType {
  const p = platform.toLowerCase();
  if (p.includes("github")) return Github;
  if (p.includes("twitter") || p.includes("x")) return AtSign;
  if (p.includes("discord")) return MessageCircle;
  if (p.includes("telegram")) return Send;
  if (p.includes("reddit")) return Globe;
  if (p.includes("academia")) return BookOpen;
  if (p.includes("researchgate")) return Search;
  if (p.includes("slideshare")) return Layers;
  if (p.includes("scribd")) return Book;
  return Globe;
}

export default function Propagation() {
  const { data } = useGetPropagationData({});

  const buildTimelineData = (): TimelineItem[] => {
    if (!data?.nodes || data.nodes.length === 0) return [];

    const childNodes = data.nodes.filter((n) => n.type !== "origin");

    const idMap = new Map<string, number>();
    childNodes.forEach((node, idx) => {
      idMap.set(node.id, idx + 1);
    });

    return childNodes.map((node) => {
      const numericId = idMap.get(node.id)!;
      const score = node.similarityScore ?? 0;
      const energy = Math.round(score * 100);

      const status: TimelineItem["status"] =
        score >= 0.85 ? "completed" : score >= 0.7 ? "in-progress" : "pending";

      const connectedIds = data.links
        .filter((l) => l.source === node.id || l.target === node.id)
        .map((l) => {
          const otherId = l.source === node.id ? l.target : l.source;
          return idMap.get(otherId);
        })
        .filter((id): id is number => id !== undefined && id !== numericId);

      return {
        id: numericId,
        title: node.platform,
        date: `${energy}% Match`,
        content: `Detected ${energy}% content similarity with the origin asset on ${node.platform}.`,
        category: node.type,
        icon: getPlatformIcon(node.platform),
        relatedIds: connectedIds,
        status,
        energy,
      };
    });
  };

  const timelineData = buildTimelineData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-gradient mb-2">Propagation Network</h1>
        <p className="text-muted-foreground">Visualize how your content spreads across different platforms.</p>
      </div>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="w-5 h-5 text-primary" />
            Content Graph
          </CardTitle>
          <CardDescription>Visualizing relationships between the origin asset and detected instances.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {data ? (
            timelineData.length > 0 ? (
              <RadialOrbitalTimeline timelineData={timelineData} />
            ) : (
              <div className="w-full h-[600px] bg-black/20 rounded-xl flex items-center justify-center border border-border/20">
                <Network className="w-12 h-12 text-primary/30" />
              </div>
            )
          ) : (
            <div className="w-full h-[600px] bg-black/20 rounded-xl flex items-center justify-center animate-pulse border border-border/20">
              <Network className="w-12 h-12 text-primary/30" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
