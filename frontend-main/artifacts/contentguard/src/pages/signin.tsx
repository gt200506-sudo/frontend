import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Mail, Lock, Eye, EyeOff, AlertCircle, Github } from "lucide-react";
import { motion } from "framer-motion";

export default function SignIn() {
  const { signIn } = useAuth();
  const [, setLocation] = useLocation();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await signIn(form.email, form.password);
    setIsLoading(false);

    if (result.success) {
      setLocation("/");
    } else {
      setError(result.error || "Sign in failed.");
    }
  };

  const fillDemo = (email: string, password: string) => {
    setForm({ email, password });
    setError("");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-xl shadow-primary/30 mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold text-gradient">ContentGuard</h1>
          <p className="text-muted-foreground mt-1 text-sm">AI + Web3 Digital Asset Protection</p>
        </div>

        <Card className="glass-panel border-border/40 shadow-2xl shadow-black/40">
          <CardHeader className="pb-4 text-center">
            <h2 className="text-xl font-bold">Welcome back</h2>
            <p className="text-muted-foreground text-sm">Sign in to your account to continue</p>
          </CardHeader>
          <CardContent className="space-y-5 px-6 pb-6">

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="pl-9 bg-background/50 border-border/50 focus-visible:ring-primary/30"
                    value={form.email}
                    onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" px-title="Forgot password?" className="text-xs text-primary hover:text-primary/80 transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    className="pl-9 pr-10 bg-background/50 border-border/50 focus-visible:ring-primary/30"
                    value={form.password}
                    onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 h-11"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </span>
                ) : "Sign In"}
              </Button>
            </form>
            
            <div className="text-center pt-2">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/signup" className="text-primary font-medium hover:underline transition-all">
                  Sign up
                </Link>
              </p>
            </div>

            <div className="pt-2 p-3 rounded-xl bg-white/[0.02] border border-border/30 space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Demo Credentials</p>
              <button
                type="button"
                onClick={() => fillDemo("demo@contentguard.io", "demo1234")}
                className="w-full text-left text-xs p-2 rounded-lg hover:bg-white/[0.04] transition-colors"
              >
                <span className="text-foreground font-mono">demo@contentguard.io</span>
                <span className="text-muted-foreground"> / </span>
                <span className="text-foreground font-mono">demo1234</span>
                <span className="ml-2 text-primary text-xs">← click to fill</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("admin@contentguard.io", "admin1234")}
                className="w-full text-left text-xs p-2 rounded-lg hover:bg-white/[0.04] transition-colors"
              >
                <span className="text-foreground font-mono">admin@contentguard.io</span>
                <span className="text-muted-foreground"> / </span>
                <span className="text-foreground font-mono">admin1234</span>
                <span className="ml-2 text-primary text-xs">← click to fill</span>
              </button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Protected by ContentGuard AI + Blockchain security infrastructure
        </p>
      </motion.div>
    </div>
  );
}
