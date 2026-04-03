import { useState } from "react";
import { useListContent } from "@workspace/api-client-react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, FileText, Image as ImageIcon, BookOpen, Shield, File, AlignLeft, Video, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

export default function ContentLibrary() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const { data, isLoading } = useListContent({ limit: 50 });

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
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or author..."
              className="pl-9 bg-background/50 border-border/50 focus-visible:ring-primary/30"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredItems.length} asset{filteredItems.length !== 1 ? "s" : ""}
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
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No assets found{typeFilter !== "all" ? ` in the "${typeFilter}" category` : ""}.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
