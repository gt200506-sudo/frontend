import { useMemo } from "react";
import { useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy, Fingerprint } from "lucide-react";

export default function ContentView() {
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const hash = params.get("hash") ?? "";
  const title = params.get("title") ?? "Content";
  const { toast } = useToast();

  const copyHash = async () => {
    if (!hash) return;
    try {
      await navigator.clipboard.writeText(hash);
      toast({ title: "Copied", description: "Content hash copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8">
      <Card className="glass-panel border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Fingerprint className="w-5 h-5 text-primary" />
            {title}
          </CardTitle>
          <CardDescription>Cryptographic fingerprint (SHA-256) for this asset.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-xl bg-white/[0.03] border border-border/40">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Content hash</p>
            <p className="font-mono text-sm text-foreground break-all leading-relaxed">
              {hash || "—"}
            </p>
          </div>
          <Button type="button" onClick={copyHash} disabled={!hash} className="w-full sm:w-auto">
            <Copy className="w-4 h-4 mr-2" />
            Copy hash
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
