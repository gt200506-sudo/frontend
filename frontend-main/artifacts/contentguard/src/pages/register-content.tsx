import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRegisterContent } from "@workspace/api-client-react";
import type { RegisterContentRequestType } from "@workspace/api-client-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Shield, UploadCloud, Hexagon, BookOpen, FileText, Image as ImageIcon, File, AlignLeft, Calendar, ExternalLink, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { useAuth } from "@/context/auth";

const ASSET_TYPES = [
  { value: "course", label: "Online Course", icon: BookOpen, desc: "Video lectures, modules, e-learning content" },
  { value: "paper", label: "Research Paper", icon: FileText, desc: "Academic papers, journals, whitepapers" },
  { value: "image", label: "Digital Image", icon: ImageIcon, desc: "Photos, illustrations, artwork, graphics" },
  { value: "text", label: "Text Content", icon: AlignLeft, desc: "Articles, blog posts, written works" },
  { value: "document", label: "Document", icon: File, desc: "PDF, DOC, presentations, reports" },
];

export default function RegisterContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { mutate: register, isPending } = useRegisterContent();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<null | { ipfsHash: string; contentHash: string; fileType: string; gatewayUrl: string }>(null);

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];

  const isImageFile = (file: File) => file.type.startsWith("image/");

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const updateAssetTypeFromMime = (mimeType: string): RegisterContentRequestType => {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType === "text/plain") return "document";
    return "document";
  };

  const handleFileSelected = (file: File | null) => {
    if (!file) return;
    if (!allowedTypes.includes(file.type)) {
      setUploadError("Unsupported file type. Please upload JPG, PNG, PDF, DOCX, or TXT.");
      return;
    }

    setUploadError(null);
    setUploadSuccess(null);
    setUploadProgress(0);
    setSelectedFile(file);
    setPreviewUrl(isImageFile(file) ? URL.createObjectURL(file) : null);
  };

  const uploadToBackend = async () => {
    if (!selectedFile || !user) {
      setUploadError("Please sign in and choose a file.");
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);
      setUploadProgress(15);

      const form = new FormData();
      form.append("file", selectedFile);
      const response = await fetch("/api/content/upload", {
        method: "POST",
        headers: {
          "x-user-id": user.email,
        },
        body: form,
      });

      setUploadProgress(70);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.details || payload?.message || payload?.error || "Upload failed");
      }

      const data = payload?.data;
      setUploadProgress(100);
      setUploadSuccess({
        ipfsHash: data?.ipfsHash || "",
        contentHash: data?.contentHash || "",
        fileType: data?.fileType || selectedFile.type,
        gatewayUrl: data?.gatewayUrl || `https://gateway.pinata.cloud/ipfs/${data?.ipfsHash || ""}`,
      });

      setFormData((prev) => ({
        ...prev,
        title: prev.title || selectedFile.name,
        type: updateAssetTypeFromMime(data?.fileType || selectedFile.type),
        contentHash: data?.contentHash || prev.contentHash,
      }));

      void queryClient.invalidateQueries({ queryKey: ["/api/content"] });

      toast({ title: "Upload complete", description: "File uploaded to IPFS and registered with scan metadata." });
    } catch (error: any) {
      setUploadError(error?.message || "Could not upload file.");
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const generateMockHash = () => {
    toast({
      title: "Use file upload for real hash",
      description: "Content hash is generated from the actual file during upload.",
      variant: "destructive",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadSuccess?.contentHash) {
      void queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      toast({ title: "Success", description: "Content uploaded and registered successfully." });
      setLocation("/content");
      return;
    }
    if (!formData.contentHash) {
      toast({ title: "Error", description: "Please upload a file first to generate a content hash.", variant: "destructive" });
      return;
    }

    register(
      { data: { ...formData, similarityThreshold: formData.similarityThreshold / 100 } },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: ["/api/content"] });
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
        <Card className="glass-panel">
          <CardHeader className="border-b border-border/50 bg-white/[0.01]">
            <CardTitle className="flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-primary" />
              Upload Asset
            </CardTitle>
            <CardDescription>Drag and drop or browse files (JPG, PNG, PDF, DOCX, TXT).</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div
              role="button"
              tabIndex={0}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFileSelected(e.dataTransfer.files?.[0] ?? null);
              }}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
              }}
              className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                isDragging ? "border-primary bg-primary/10" : "border-border/50 hover:border-primary/40"
              }`}
            >
              <UploadCloud className="w-8 h-8 mx-auto text-primary mb-3" />
              <p className="font-medium">Drop your file here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">Maximum supported types: JPG, PNG, PDF, DOCX, TXT</p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".jpg,.jpeg,.png,.pdf,.docx,.txt"
                onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
              />
            </div>

            {selectedFile && (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-border/40 space-y-3">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="max-h-44 rounded-lg object-contain border border-border/40" />
                ) : (
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">{selectedFile.name}</p>
                    <p>{selectedFile.type || "Unknown type"} • {formatBytes(selectedFile.size)}</p>
                  </div>
                )}
                <div className="flex justify-between items-center gap-3">
                  <div className="text-xs text-muted-foreground">
                    {selectedFile.name} • {formatBytes(selectedFile.size)}
                  </div>
                  <Button type="button" onClick={uploadToBackend} disabled={isUploading}>
                    {isUploading ? "Uploading..." : "Upload to IPFS"}
                  </Button>
                </div>
                {(isUploading || uploadProgress > 0) && <Progress value={uploadProgress} />}
              </div>
            )}

            {uploadError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="w-4 h-4" />
                {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <p className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Upload successful
                </p>
                <div className="text-xs text-muted-foreground mt-1">
                  <p>CID: {uploadSuccess.ipfsHash}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3"
                  onClick={() => window.open(uploadSuccess.gatewayUrl, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on IPFS
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

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
