import { customFetch, useListContent } from "@workspace/api-client-react";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Network, Github, Globe, MessageCircle, Send, BookOpen, Search, Layers, Book, AtSign } from "lucide-react";
import RadialOrbitalTimeline from "@/components/ui/radial-orbital-timeline";
import type { TimelineItem } from "@/components/ui/radial-orbital-timeline";
import { Button } from "@/components/ui/button";

type PropagationEvent = {
  id: string;
  title: string;
  timestamp: string;
  type: "source" | "share" | "detection";
  score: number;
};

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
  const [selectedContentId, setSelectedContentId] = useState<string>("");
  const [events, setEvents] = useState<PropagationEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: contentData } = useListContent({ limit: 100 });

  useEffect(() => {
    if (!selectedContentId && contentData?.items?.length) {
      setSelectedContentId(contentData.items[0].id);
    }
  }, [contentData, selectedContentId]);

  const fetchPropagation = async (contentId: string) => {
    if (!contentId) return;
    setLoading(true);
    setError(null);
    try {
      console.log("[propagation] GET /api/propagation-network/:contentId", contentId);
      const res = await customFetch<PropagationEvent[]>(`/api/propagation-network/${contentId}`, {
        method: "GET",
        responseType: "json",
      });
      console.log("[propagation] response", res);
      setEvents(res);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load propagation data";
      console.error("[propagation] fetch error", e);
      setError(message);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPropagation(selectedContentId);
  }, [selectedContentId]);

  const timelineData = useMemo<TimelineItem[]>(() => {
    if (!events.length) return [];
    return events.map((event, index) => {
      const energy = Math.max(0, Math.min(100, Number(event.score || 0)));
      const status: TimelineItem["status"] =
        energy >= 80 ? "completed" : energy >= 50 ? "in-progress" : "pending";
      return {
        id: index + 1,
        title: event.title,
        date: new Date(event.timestamp).toLocaleString(),
        content: `${event.type} event with confidence score ${energy}%.`,
        category: event.type,
        icon: getPlatformIcon(event.title),
        relatedIds: index > 0 ? [index] : [],
        status,
        energy,
      };
    });
  }, [events]);

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
          <div className="mt-3 flex items-center gap-3">
            <select
              className="bg-background/70 border border-border rounded px-3 py-2 text-sm min-w-[260px]"
              value={selectedContentId}
              onChange={(e) => setSelectedContentId(e.target.value)}
            >
              {(contentData?.items ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
            <Button variant="outline" size="sm" onClick={() => void fetchPropagation(selectedContentId)}>
              Reload
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="w-full h-[600px] bg-black/20 rounded-xl flex flex-col items-center justify-center border border-rose-500/30 text-rose-300 gap-3">
              <p className="text-sm">{error}</p>
              <Button variant="outline" onClick={() => void fetchPropagation(selectedContentId)}>
                Retry
              </Button>
            </div>
          ) : loading ? (
            <div className="w-full h-[600px] bg-black/20 rounded-xl flex items-center justify-center animate-pulse border border-border/20">
              <Network className="w-12 h-12 text-primary/30" />
            </div>
          ) : timelineData.length > 0 ? (
            <RadialOrbitalTimeline timelineData={timelineData} />
          ) : (
            <div className="w-full h-[600px] bg-black/20 rounded-xl flex items-center justify-center border border-border/20">
              <Network className="w-12 h-12 text-primary/30" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
