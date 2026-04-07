import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Home, FileText, PlusCircle, ShieldAlert,
  Network, Hexagon, Settings,
  LogOut, ShieldCheck
} from "lucide-react";
import { useAuth } from "@/context/auth";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/content", label: "Content Library", icon: FileText },
  { href: "/content/register", label: "Register Content", icon: PlusCircle },
  { href: "/detections", label: "Detections", icon: ShieldAlert },
  { href: "/propagation", label: "Propagation Network", icon: Network },
  { href: "/web3", label: "Web3 / Blockchain", icon: Hexagon },
];

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border/40 bg-sidebar/50 backdrop-blur-xl flex flex-col fixed inset-y-0 z-50">
        <div className="p-6 flex items-center gap-3 border-b border-border/40">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">ContentGuard</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm font-medium",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-inner"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-110 duration-300", isActive ? "text-primary" : "")} />
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User + Footer */}
        <div className="p-4 border-t border-border/40 space-y-1.5">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2.5 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/60 to-accent/60 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {user.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.role}</p>
              </div>
            </div>
          )}
          <Link href="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors text-sm font-medium">
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </Link>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors text-sm font-medium text-left"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 min-h-screen pb-12">
        <div className="max-w-[1600px] mx-auto p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
