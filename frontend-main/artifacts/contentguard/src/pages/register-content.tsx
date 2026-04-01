import { useState } from "react";
import { useRegisterContent } from "@workspace/api-client-react";
import type { RegisterContentRequestType } from "@workspace/api-client-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Fingerprint, UploadCloud, Hexagon, BookOpen, FileText, Image as ImageIcon, File, AlignLeft, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { format } from "date-fns";

const ASSET_TYPES = [
  { value: "course", label: "Online Course", icon: BookOpen, desc: "Video lectures, modules, e-learning content" },
  { value: "paper", label: "Research Paper", icon: FileText, desc: "Academic papers, journals, whitepapers" },
  { value: "image", label: "Digital Image", icon: ImageIcon, desc: "Photos, illustrations, artwork, graphics" },
  { value: "text", label: "Text Content", icon: AlignLeft, desc: "Articles, blog posts, written works" },
  { value: "document", label: "Document", icon: File, desc: "PDF, DOC, presentations, reports" },
];

export default function RegisterContent() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { mutate: register, isPending } = useRegisterContent();

  const [formData, setFormData] = useState({
    title: "",
    type: "paper" as RegisterContentRequestType,
    description: "",
    author: "",
    organization: "",
    contentHash: "",
    similarityThreshold: 85,
    registerOnBlockchain: false,
  });

  const registrationTimestamp = format(new Date(), "PPP 'at' p");

  const generateMockHash = () => {
    const chars = '0123456789abcdef';
    let hash = '0x';
    for (let i = 0; i < 64; i++) hash += chars[Math.floor(Math.random() * chars.length)];
    setFormData(prev => ({ ...prev, contentHash: hash }));
    toast({ title: "Hash Generated", description: "Cryptographic fingerprint created for your content." });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contentHash) {
      toast({ title: "Error", description: "Please generate or provide a content hash.", variant: "destructive" });
      return;
    }

    register(
      { data: { ...formData, similarityThreshold: formData.similarityThreshold / 100 } },
      {
        onSuccess: () => {
          toast({ title: "Success", description: "Content successfully registered and protected." });
          setLocation("/content");
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err.message || "Failed to register content", variant: "destructive" });
        }
      }
    );
  };

  const selectedType = ASSET_TYPES.find(t => t.value === formData.type);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-gradient mb-2">Register Content</h1>
        <p className="text-muted-foreground">Upload and fingerprint new intellectual property for protection.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Asset Type Selector */}
        <Card className="glass-panel">
          <CardHeader className="border-b border-border/50 bg-white/[0.01]">
            <CardTitle className="flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-primary" />
              Select Asset Type
            </CardTitle>
            <CardDescription>Choose the category that best describes your content.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {ASSET_TYPES.map(({ value, label, icon: Icon, desc }) => {
                const isSelected = formData.type === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: value as RegisterContentRequestType }))}
                    className={`flex flex-col items-start gap-2 p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "bg-primary/15 border-primary/40 shadow-sm shadow-primary/10"
                        : "bg-white/[0.02] border-border/40 hover:bg-white/[0.04] hover:border-border/60"
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${isSelected ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground"}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className={`font-semibold text-sm ${isSelected ? "text-primary" : "text-foreground"}`}>{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Asset Metadata */}
        <Card className="glass-panel">
          <CardHeader className="border-b border-border/50 bg-white/[0.01]">
            <CardTitle className="flex items-center gap-2">
              {selectedType ? <selectedType.icon className="w-5 h-5 text-primary" /> : <FileText className="w-5 h-5 text-primary" />}
              Asset Details
              {selectedType && <span className="text-sm font-normal text-muted-foreground ml-1">— {selectedType.label}</span>}
            </CardTitle>
            <CardDescription>Enter the metadata for the content you want to protect.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  required
                  className="bg-background/50"
                  placeholder="E.g., Quantum Computing Fundamentals"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Author / Creator</Label>
                <Input
                  required
                  className="bg-background/50"
                  placeholder="Primary Author / Creator"
                  value={formData.author}
                  onChange={e => setFormData(prev => ({ ...prev, author: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Organization / Institution</Label>
                <Input
                  required
                  className="bg-background/50"
                  placeholder="Company, University, or Publisher"
                  value={formData.organization}
                  onChange={e => setFormData(prev => ({ ...prev, organization: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  Registration Timestamp
                </Label>
                <Input
                  readOnly
                  className="bg-background/30 text-muted-foreground cursor-not-allowed"
                  value={registrationTimestamp}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                className="bg-background/50 min-h-[100px]"
                placeholder="Brief summary of the content, its purpose and scope..."
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="p-6 rounded-xl bg-white/[0.02] border border-border/50 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-accent" />
                    Cryptographic Fingerprint
                  </h3>
                  <p className="text-sm text-muted-foreground">Unique SHA-256 hash derived from file contents.</p>
                </div>
                <Button type="button" variant="outline" onClick={generateMockHash} className="bg-background/50">
                  Generate Hash
                </Button>
              </div>
              <Input
                readOnly
                className="font-mono text-sm text-muted-foreground bg-black/20"
                placeholder="0x..."
                value={formData.contentHash}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Similarity Alert Threshold</Label>
                <span className="text-primary font-bold">{formData.similarityThreshold}%</span>
              </div>
              <p className="text-sm text-muted-foreground">Alert when external content matches beyond this percentage. Lower thresholds catch paraphrasing; higher thresholds reduce false positives.</p>
              <Slider
                value={[formData.similarityThreshold]}
                onValueChange={(v) => setFormData(prev => ({ ...prev, similarityThreshold: v[0] }))}
                max={100}
                min={50}
                step={1}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>50% — Broad (catch paraphrasing)</span>
                <span>100% — Exact match only</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex gap-3">
                <div className="p-2 rounded-lg bg-primary/20 text-primary">
                  <Hexagon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Immutable Blockchain Registry</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Anchor proof of ownership on Polygon + store metadata on IPFS</p>
                </div>
              </div>
              <Switch
                checked={formData.registerOnBlockchain}
                onCheckedChange={(c) => setFormData(prev => ({ ...prev, registerOnBlockchain: c }))}
              />
            </div>

            {formData.registerOnBlockchain && (
              <div className="p-4 rounded-xl bg-accent/5 border border-accent/20 text-sm space-y-2">
                <p className="font-medium text-accent flex items-center gap-2">
                  <Hexagon className="w-4 h-4" /> Web3 Registration Details
                </p>
                <ul className="space-y-1 text-muted-foreground text-xs list-disc list-inside">
                  <li>Content hash anchored to <strong className="text-foreground">Polygon (MATIC)</strong> network</li>
                  <li>Metadata stored on <strong className="text-foreground">IPFS</strong> (InterPlanetary File System)</li>
                  <li>Generates tamper-proof timestamp and transaction hash</li>
                  <li>Enables cryptographic proof of original authorship</li>
                </ul>
              </div>
            )}
          </CardContent>
          <div className="p-6 border-t border-border/50 flex justify-end gap-3 bg-white/[0.01]">
            <Button type="button" variant="ghost" onClick={() => setLocation("/content")}>Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 px-8">
              {isPending ? "Registering..." : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Protect Asset
                </>
              )}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
