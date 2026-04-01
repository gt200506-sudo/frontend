import { useState } from "react";
import { useRegisterOnBlockchain, useVerifyOwnership } from "@workspace/api-client-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Hexagon, Lock, Link as LinkIcon, Search, ShieldCheck, Database, Globe, Clock, Copy, CheckCheck } from "lucide-react";
import { format } from "date-fns";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function HashField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2 border border-border/40">
        <code className="text-xs font-mono text-foreground flex-1 break-all">{value}</code>
        <CopyButton value={value} />
      </div>
    </div>
  );
}

const TECH_STACK = [
  { icon: Hexagon, label: "Polygon Network", desc: "MATIC — Low-fee EVM chain", color: "text-violet-400 bg-violet-500/10" },
  { icon: Database, label: "IPFS Storage", desc: "Decentralized file system", color: "text-blue-400 bg-blue-500/10" },
  { icon: Globe, label: "Smart Contracts", desc: "Solidity-based ownership registry", color: "text-emerald-400 bg-emerald-500/10" },
  { icon: Clock, label: "Tamper-Proof Timestamp", desc: "Immutable on-chain record", color: "text-amber-400 bg-amber-500/10" },
];

export default function Web3() {
  const [registerId, setRegisterId] = useState("");
  const [wallet, setWallet] = useState("");
  const [verifyId, setVerifyId] = useState("");
  const [triggerVerify, setTriggerVerify] = useState("");

  const { mutate: register, isPending: isRegistering, data: regResult } = useRegisterOnBlockchain();

  const { data: verifyResult, isLoading: isVerifying } = useVerifyOwnership(triggerVerify, {
    query: { enabled: !!triggerVerify }
  });

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    register({ data: { contentId: registerId, walletAddress: wallet } });
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setTriggerVerify(verifyId);
  };

  const mockIpfsHash = regResult ? `Qm${regResult.txHash?.slice(2, 46)}` : null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-accent/20 border border-accent/20">
        <img
          src={`${import.meta.env.BASE_URL}images/web3-bg.png`}
          alt="Web3 Blockchain"
          className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-screen"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent"></div>
        <div className="relative z-10 p-10">
          <Hexagon className="w-12 h-12 text-accent mb-4" />
          <h1 className="text-4xl font-display font-bold text-white mb-2">Immutable Proof of Ownership</h1>
          <p className="text-lg text-slate-300 max-w-2xl">
            Anchor your content fingerprints to the Polygon network. Metadata stored on IPFS. Establish cryptographic proof of creation that cannot be altered or disputed.
          </p>
        </div>
      </div>

      {/* Tech Stack Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {TECH_STACK.map(({ icon: Icon, label, desc, color }) => (
          <Card key={label} className="glass-panel">
            <CardContent className="p-4 flex flex-col gap-3">
              <div className={`p-2.5 rounded-xl w-fit ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Register */}
        <Card className="glass-panel border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-accent">
              <Lock className="w-5 h-5" />
              Register Content Hash
            </CardTitle>
            <CardDescription>Publish your existing content ID to the Polygon blockchain. Metadata is stored via IPFS.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Content ID</label>
                <Input
                  required
                  placeholder="e.g. cont_1234abc"
                  value={registerId}
                  onChange={(e) => setRegisterId(e.target.value)}
                  className="bg-background/50 focus-visible:ring-accent"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Owner Wallet Address</label>
                <Input
                  required
                  placeholder="0x..."
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  className="bg-background/50 focus-visible:ring-accent"
                />
              </div>
              <Button
                type="submit"
                disabled={isRegistering}
                className="w-full bg-accent hover:bg-accent/90 text-white shadow-lg shadow-accent/25"
              >
                {isRegistering ? "Anchoring to Blockchain..." : "Anchor to Blockchain"}
              </Button>
            </form>

            {regResult && (
              <div className="mt-6 p-4 rounded-xl bg-accent/10 border border-accent/20 space-y-3 text-sm">
                <div className="flex items-center gap-2 text-accent font-semibold">
                  <ShieldCheck className="w-4 h-4" /> Successfully Registered on Polygon
                </div>

                <HashField label="Transaction Hash" value={regResult.txHash} />
                {mockIpfsHash && <HashField label="IPFS Content Hash (CID)" value={mockIpfsHash} />}

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-black/20 rounded-lg p-2.5">
                    <p className="text-muted-foreground mb-1">Block Number</p>
                    <p className="font-mono font-bold">{regResult.blockNumber?.toLocaleString()}</p>
                  </div>
                  <div className="bg-black/20 rounded-lg p-2.5">
                    <p className="text-muted-foreground mb-1">Network</p>
                    <p className="font-mono font-bold">{regResult.network}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <a href="#" className="flex items-center gap-1 text-xs text-primary hover:underline">
                    <LinkIcon className="w-3 h-3" /> View on Polygonscan
                  </a>
                  <span className="text-muted-foreground">•</span>
                  <a href="#" className="flex items-center gap-1 text-xs text-blue-400 hover:underline">
                    <Database className="w-3 h-3" /> View on IPFS Gateway
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Verify */}
        <Card className="glass-panel border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Search className="w-5 h-5" />
              Verify Ownership
            </CardTitle>
            <CardDescription>Check the blockchain record of any registered content. Retrieves on-chain and IPFS data.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Content ID to Verify</label>
                <Input
                  required
                  placeholder="e.g. cont_1234abc"
                  value={verifyId}
                  onChange={(e) => setVerifyId(e.target.value)}
                  className="bg-background/50 focus-visible:ring-primary"
                />
              </div>
              <Button
                type="submit"
                disabled={isVerifying}
                className="w-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25"
              >
                {isVerifying ? "Verifying Record..." : "Verify Record"}
              </Button>
            </form>

            {verifyResult && (
              <div className={`mt-6 p-4 rounded-xl border space-y-3 ${verifyResult.verified ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                {verifyResult.verified ? (
                  <>
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold text-base">
                      <ShieldCheck className="w-5 h-5" /> Verified Authentic
                    </div>

                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Owner Wallet</p>
                        <div className="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-2 border border-border/30">
                          <code className="font-mono text-xs flex-1 break-all">{verifyResult.ownerAddress}</code>
                          <CopyButton value={verifyResult.ownerAddress} />
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-1 bg-black/20 rounded-lg p-2.5">
                          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Registered
                          </p>
                          <p className="text-xs font-medium">{verifyResult.registeredAt ? format(new Date(verifyResult.registeredAt), "PPP") : 'N/A'}</p>
                        </div>
                        <div className="flex-1 bg-black/20 rounded-lg p-2.5">
                          <p className="text-xs text-muted-foreground mb-1">Storage</p>
                          <Badge variant="outline" className="text-blue-400 border-blue-500/20 bg-blue-500/10 text-xs">
                            <Database className="w-3 h-3 mr-1" /> IPFS + Polygon
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <a href="#" className="flex items-center gap-1 text-xs text-primary hover:underline">
                        <LinkIcon className="w-3 h-3" /> View on Polygonscan
                      </a>
                      <span className="text-muted-foreground text-xs">•</span>
                      <a href="#" className="flex items-center gap-1 text-xs text-blue-400 hover:underline">
                        <Database className="w-3 h-3" /> View IPFS Record
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-rose-400 font-semibold text-base">
                    <Lock className="w-5 h-5" /> No On-Chain Record Found
                    <p className="text-xs text-muted-foreground font-normal">This content has not been registered on the blockchain.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
