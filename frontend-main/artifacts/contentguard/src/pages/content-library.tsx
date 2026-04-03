import { useEffect, useState } from "react";
import { useListContent } from "@workspace/api-client-react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  FileText,
  Image as ImageIcon,
  BookOpen,
  Shield,
  File,
  AlignLeft,
  Video,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Skull,
  Info,
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  startAIDetection,
  detectResultFromPayload,
  itemsToResultMap,
  type DetectContentResultItem,
  type DetectContentMatch,
} from "@/lib/contentDetection";

function getIpfsGatewayUrl(ipfsHash: string | null | undefined): string | null {
  const cid = ipfsHash?.trim();
  if (!cid) return null;
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}

const TYPE_FILTERS = [
  { value: "all", label: "All Assets", icon: Shield },
  { value: "paper", label: "Research Paper", icon: FileText },
  { value: "course", label: "Online Course", icon: BookOpen },
  { value: "image", label: "Digital Image", icon: ImageIcon },
  { value: "document", label: "Document", icon: File },
  { value: "text", label: "Text Content", icon: AlignLeft },
];

type DetectionPhase = "idle" | "running" | "completed";

export default function ContentLibrary() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const { data, isLoading, refetch } = useListContent({ limit: 50 });

  const [detectionPhase, setDetectionPhase] = useState<DetectionPhase>("idle");
  const [detectionById, setDetectionById] = useState<Record<string, DetectContentResultItem>>({});
  const [detailContentId, setDetailContentId] = useState<string | null>(null);

  useEffect(() => {
    const items = data?.items;
    if (!items?.length) return;
    setDetectionById((prev) => {
      const next = { ...prev };
      for (const item of items) {
        const fromDb = detectResultFromPayload(item.id, item.libraryMatches);
        if (fromDb) next[item.id] = fromDb;
      }
      return next;
    });
  }, [data?.items]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'paper': return <FileText className="w-4 h-4" />;
      case 'image': return <ImageIcon className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'course': return <BookOpen className="w-4 h-4" />;
      case 'document': return <File className="w-4 h-4" />;
      case 'text': return <AlignLeft className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'paper': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'course': return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
      case 'image': return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      case 'video': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'document': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'text': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'monitoring': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'archived': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const filteredItems = (data?.items || []).filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const typeCounts = (data?.items || []).reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleStartAIDetection = async () => {
    const ids = (data?.items ?? []).map((i) => i.id);
    if (!ids.length) {
      toast({
        title: "No content to scan",
        description: "Upload or register assets first.",
        variant: "destructive",
      });
      return;
    }
    setDetectionPhase("running");
    setDetectionById({});
    try {
      const res = await startAIDetection({ contentIds: ids });
      setDetectionById((prev) => ({
        ...prev,
        ...itemsToResultMap(res.items, res.processedAt),
      }));
      setDetectionPhase("completed");
      await refetch();
      toast({
        title: "Scan complete",
        description:
          res.truncated && res.totalEligible != null
            ? `Analyzed ${res.count} of ${res.totalEligible} asset(s) (batch cap ${res.maxBatch ?? "—"}). Run again or narrow with content IDs.`
            : `Analyzed ${res.count} asset(s).`,
      });
      for (const n of res.notifications ?? []) {
        toast({
          title: "Possible web match",
          description: (
            <span className="block space-y-1">
              <span>
                {n.message} — Risk: <strong>{n.risk}</strong> ({n.similarity}%)
              </span>
              {n.topUrl ? (
                <a
                  href={n.topUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline break-all"
                >
                  {n.topUrl}
                </a>
              ) : null}
            </span>
          ),
          variant: n.risk === "High" ? "destructive" : "default",
        });
      }
    } catch (e: unknown) {
      setDetectionPhase("idle");
      const msg = e instanceof Error ? e.message : "Request failed";
      toast({
        title: "Detection failed",
        description: msg,
        variant: "destructive",
      });
    }
  };

  const detailResult = detailContentId ? detectionById[detailContentId] : undefined;

  const matchRiskClass = (m: DetectContentMatch) => {
    if (m.status === "high" || m.similarity >= 75) return "text-rose-400 border-rose-500/30 bg-rose-500/10";
    if (m.status === "medium" || m.similarity >= 50) return "text-amber-400 border-amber-500/30 bg-amber-500/10";
    return "text-slate-300 border-border/50 bg-white/[0.04]";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-gradient mb-2">Content Library</h1>
          <p className="text-muted-foreground">Manage and browse your protected digital assets by category.</p>
        </div>
        <Link href="/content/register">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25">
            <Plus className="w-4 h-4 mr-2" />
            Register Content
          </Button>
        </Link>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map(({ value, label, icon: Icon }) => {
          const count = value === "all" ? (data?.items?.length || 0) : (typeCounts[value] || 0);
          const isActive = typeFilter === value;
          return (
            <button
              key={value}
              onClick={() => setTypeFilter(value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                isActive
                  ? "bg-primary/20 text-primary border-primary/40 shadow-sm shadow-primary/10"
                  : "bg-white/[0.02] text-muted-foreground border-border/40 hover:bg-white/[0.04] hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${isActive ? "bg-primary/30" : "bg-white/10"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <Card className="glass-panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or author..."
                className="pl-9 bg-background/50 border-border/50 focus-visible:ring-primary/30"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="text-sm text-muted-foreground whitespace-nowrap">
              {filteredItems.length} asset{filteredItems.length !== 1 ? "s" : ""}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span
                className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                  detectionPhase === "idle"
                    ? "bg-muted-foreground/50"
                    : detectionPhase === "running"
                      ? "bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)] animate-pulse"
                      : "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]"
                }`}
                aria-hidden
              />
              <span className="text-muted-foreground">
                {detectionPhase === "idle" && "Detection not started"}
                {detectionPhase === "running" && "Scanning the web…"}
                {detectionPhase === "completed" && "Scan complete"}
              </span>
            </div>
            <Button
              type="button"
              onClick={() => void handleStartAIDetection()}
              disabled={detectionPhase === "running" || isLoading}
              className="relative overflow-hidden bg-gradient-to-r from-primary via-primary to-accent text-primary-foreground shadow-lg shadow-primary/30 hover:opacity-[0.98] border-0"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none" />
              <Sparkles className="w-4 h-4 mr-2 relative" />
              <span className="relative font-semibold">Start AI Detection</span>
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border/50 overflow-hidden bg-background/20">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-white/[0.02] uppercase border-b border-border/50">
              <tr>
                <th className="px-6 py-4 font-medium">Asset</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Detections</th>
                <th className="px-6 py-4 font-medium">Detection Status</th>
                <th className="px-6 py-4 font-medium">Registered</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 w-32 bg-white/10 rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-16 bg-white/10 rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-20 bg-white/10 rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-8 bg-white/10 rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-28 bg-white/10 rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-white/10 rounded"></div></td>
                    <td className="px-6 py-4"><div className="h-4 w-12 bg-white/10 rounded ml-auto"></div></td>
                  </tr>
                ))
              ) : filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{item.title}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={getTypeBadgeColor(item.type)}>
                        <span className="flex items-center gap-1.5">
                          {getTypeIcon(item.type)}
                          <span className="capitalize">{item.type}</span>
                        </span>
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={getStatusColor(item.status)}>
                        {item.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-medium">
                        {item.detectionCount > 0 ? (
                          <span className="text-amber-400">{item.detectionCount}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const r = detectionById[item.id];
                        if (!r) {
                          return <span className="text-muted-foreground text-xs">Not scanned</span>;
                        }
                        const hasMatches = r.matches.length > 0;
                        if (r.status === "not_matched") {
                          return (
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                No Issues
                              </Badge>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => setDetailContentId(item.id)}
                              >
                                <Info className="w-3 h-3 mr-1" />
                                {hasMatches ? "View Matches" : "Details"}
                              </Button>
                            </div>
                          );
                        }
                        if (r.status === "potential") {
                          return (
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-400 gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Potential Match
                              </Badge>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => setDetailContentId(item.id)}
                              >
                                <Info className="w-3 h-3 mr-1" />
                                View Matches
                              </Button>
                            </div>
                          );
                        }
                        return (
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-400 gap-1">
                              <Skull className="w-3 h-3" />
                              High Risk
                            </Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => setDetailContentId(item.id)}
                            >
                              <Info className="w-3 h-3 mr-1" />
                              View Matches
                            </Button>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {format(new Date(item.registeredAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1"
                              onClick={() => {
                                const gatewayUrl = getIpfsGatewayUrl(item.ipfsHash);
                                if (!gatewayUrl) {
                                  toast({
                                    title: "File not available on IPFS",
                                    description: "This asset has no IPFS hash.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                window.open(gatewayUrl, "_blank", "noopener,noreferrer");
                              }}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              View
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Open from IPFS</TooltipContent>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No assets found{typeFilter !== "all" ? ` in the "${typeFilter}" category` : ""}.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={detailContentId != null} onOpenChange={(open) => !open && setDetailContentId(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto border-border/50 bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>Web detection matches</DialogTitle>
            <DialogDescription>
              Results from SerpAPI search and text similarity. Scrape-assisted when snippets are weak.
            </DialogDescription>
          </DialogHeader>
          {detailResult && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-border/50 bg-background/40 p-3 space-y-2">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Overall</span>
                  <span className="font-medium capitalize">{detailResult.status.replace("_", " ")}</span>
                </div>
                {detailResult.scannedAt ? (
                  <div className="flex justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">Scanned</span>
                    <span className="font-mono text-muted-foreground">
                      {format(new Date(detailResult.scannedAt), "MMM d, yyyy HH:mm")}
                    </span>
                  </div>
                ) : null}
                <div className="pt-1">
                  <span className="text-muted-foreground block mb-1">Fingerprint</span>
                  <code className="text-xs break-all text-muted-foreground">{detailResult.fingerprint || "—"}</code>
                </div>
                {detailResult.warnings?.length ? (
                  <div className="text-xs text-amber-500/90 space-y-1">
                    {detailResult.warnings.map((w, i) => (
                      <p key={i}>{w}</p>
                    ))}
                  </div>
                ) : null}
              </div>

              {detailResult.matches.length === 0 ? (
                <p className="text-muted-foreground text-sm">No above-threshold URL matches for this asset.</p>
              ) : (
                <ul className="space-y-2">
                  {detailResult.matches.map((m, idx) => (
                    <li
                      key={`${m.url}-${idx}`}
                      className={`rounded-lg border p-3 text-sm ${matchRiskClass(m)}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium line-clamp-2">{m.title || "Untitled result"}</div>
                          <a
                            href={m.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary break-all hover:underline inline-flex items-center gap-1 mt-1"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            {m.url}
                          </a>
                          {m.snippet ? (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{m.snippet}</p>
                          ) : null}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono font-semibold">{m.similarity}%</div>
                          <div className="text-[10px] uppercase tracking-wide opacity-80">{m.status}</div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
