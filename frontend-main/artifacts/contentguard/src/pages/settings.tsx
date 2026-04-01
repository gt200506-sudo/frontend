import { useAuth } from "@/context/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Mail, 
  Shield, 
  LogOut, 
  Github, 
  Key, 
  Bell, 
  Lock,
  Globe
} from "lucide-react";
import { motion } from "framer-motion";

export default function Settings() {
  const { user, signOut } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-4xl font-display font-bold text-gradient mb-2">Account Settings</h1>
        <p className="text-muted-foreground text-lg">Manage your profile, security, and connected accounts.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Sidebar */}
        <div className="space-y-6">
          <Card className="glass-panel border-border/40 overflow-hidden">
            <CardContent className="p-6 text-center space-y-4">
              <div className="relative inline-block">
                <Avatar className="w-24 h-24 border-2 border-primary/20 shadow-xl mx-auto">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-2xl font-bold">
                    {user.avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center shadow-lg">
                  <Shield className="w-4 h-4 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold">{user.name}</h3>
                <p className="text-sm text-muted-foreground">{user.role}</p>
              </div>
              <div className="pt-2">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 hover:bg-primary/10 transition-colors">
                  Verified Owner
                </Badge>
              </div>
              <Separator className="bg-border/40" />
              <Button 
                variant="ghost" 
                className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive justify-start gap-2"
                onClick={signOut}
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-panel border-border/40">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {[
                { icon: Globe, label: "Public Profile", active: false },
                { icon: Lock, label: "Security Logs", active: false },
                { icon: Bell, label: "Notifications", active: false },
              ].map((item) => (
                <Button key={item.label} variant="ghost" className="w-full justify-start gap-3 h-10 text-sm font-medium text-muted-foreground hover:text-foreground">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          <Card className="glass-panel border-border/40">
            <CardHeader>
              <CardTitle className="text-xl">Profile Information</CardTitle>
              <CardDescription>Update your personal details and how others see you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <User className="w-4 h-4" />
                    Full Name
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-border/40 font-medium">
                    {user.name}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.03] border border-border/40 font-medium">
                    {user.email}
                  </div>
                </div>
              </div>
              <div className="pt-2">
                <Button disabled className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 shadow-none cursor-not-allowed">
                  Save Changes
                </Button>
                <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-tight opacity-60">Manual updates disabled for demo mode</p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-border/40">
            <CardHeader>
              <CardTitle className="text-xl">Connected Accounts</CardTitle>
              <CardDescription>Manage your third-party integrations and social logins.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-border/40">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#4285F4]/10 flex items-center justify-center text-[#4285F4]">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold">Google Account</h4>
                    <p className="text-xs text-muted-foreground">{user.providers?.includes("google") ? "Connected" : "Not connected"}</p>
                  </div>
                </div>
                <Badge variant={user.providers?.includes("google") ? "default" : "outline"} className={user.providers?.includes("google") ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : ""}>
                  {user.providers?.includes("google") ? "Active" : "Disconnected"}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-border/40">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-foreground">
                    <Github className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold">GitHub Account</h4>
                    <p className="text-xs text-muted-foreground">{user.providers?.includes("github") ? "Connected" : "Not connected"}</p>
                  </div>
                </div>
                <Badge variant={user.providers?.includes("github") ? "default" : "outline"} className={user.providers?.includes("github") ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : ""}>
                  {user.providers?.includes("github") ? "Active" : "Disconnected"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-border/40 border-primary/20 bg-primary/5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Key className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Security & MFA</CardTitle>
                  <CardDescription>Multi-factor authentication is recommended for all users.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="border-primary/30 hover:bg-primary/20 transition-all">
                Enable 2FA Protection
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
