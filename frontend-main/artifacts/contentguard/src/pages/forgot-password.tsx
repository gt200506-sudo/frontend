import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Mail, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [, setLocation] = useLocation();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await resetPassword(email);
      if (result.success) {
        setIsSuccess(true);
      } else {
        setError(result.error || "Failed to send reset link.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
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
        </div>

        <Card className="glass-panel border-border/40 shadow-2xl shadow-black/40 overflow-hidden">
          <AnimatePresence mode="wait">
            {!isSuccess ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <CardHeader className="pb-4 text-center">
                  <h2 className="text-xl font-bold">Reset Password</h2>
                  <p className="text-muted-foreground text-sm">
                    Enter your email to receive a password reset link
                  </p>
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
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                        />
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
                      {isLoading ? "Sending link..." : "Send Reset Link"}
                    </Button>
                  </form>

                  <div className="text-center pt-2">
                    <Link 
                      href="/signin" 
                      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Sign In
                    </Link>
                  </div>
                </CardContent>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Check your email</h2>
                <p className="text-muted-foreground mb-8">
                  If an account exists for <span className="text-foreground font-medium">{email}</span>, 
                  we've sent a password reset link.
                </p>
                <Button 
                  className="w-full h-11 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
                  onClick={() => setLocation("/signin")}
                >
                  Return to Sign In
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </div>
  );
}
