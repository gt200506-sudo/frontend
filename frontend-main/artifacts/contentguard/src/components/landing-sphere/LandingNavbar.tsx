import { Shield } from "lucide-react";
import { Link } from "wouter";

const LandingNavbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-background/80 backdrop-blur-md border-b border-border/50">
      <Link href="/" className="flex items-center gap-2">
        <Shield className="w-6 h-6 text-primary" />
        <span className="landing-display font-semibold text-lg text-foreground">ContentGuard</span>
      </Link>
      <div className="hidden md:flex items-center gap-8">
        <a href="#demo" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
          Demo
        </a>
        <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
          Features
        </a>
      </div>
      <Link
        href="/signin"
        className="px-5 py-2 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
      >
        Get Started
      </Link>
    </nav>
  );
};

export default LandingNavbar;
