import { useState } from "react";
import { useAuth } from "@/context/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { 
  User, 
  Mail, 
  Shield, 
  LogOut, 
  Key, 
  Save,
  X
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { user, signOut, updateProfile } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    password: "",
  });

  if (!user) return null;

  const handleEditToggle = () => {
    setForm({ name: user.name, email: user.email, password: "" });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setForm({ name: user.name, email: user.email, password: "" });
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.email,
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email || undefined,
          password: form.password || undefined,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "Failed to update profile");

      updateProfile({ name: form.name, email: form.email || user.email });
      setForm((prev) => ({ ...prev, password: "" }));
      setIsEditing(false);

      toast({
        title: "Profile updated",
        description: payload?.data?.emailVerificationPending
          ? "Profile saved. Email verification placeholder is enabled."
          : "Your profile changes were saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error?.message || "Unable to save profile changes.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-4xl font-display font-bold text-gradient mb-2">Account Settings</h1>
        <p className="text-muted-foreground text-lg">Manage your profile and account security.</p>
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
                  {isEditing ? (
                    <Input
                      className="bg-background/50"
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  ) : (
                    <div className="p-3 rounded-lg bg-white/[0.03] border border-border/40 font-medium">
                      {user.name}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </div>
                  {isEditing ? (
                    <Input
                      className="bg-background/50"
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  ) : (
                    <div className="p-3 rounded-lg bg-white/[0.03] border border-border/40 font-medium">
                      {user.email}
                    </div>
                  )}
                </div>
                {isEditing && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Key className="w-4 h-4" />
                      New Password (optional)
                    </div>
                    <Input
                      type="password"
                      className="bg-background/50"
                      value={form.password}
                      onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder="Leave blank to keep current password"
                    />
                  </div>
                )}
                {isEditing && (
                  <p className="text-xs text-muted-foreground">
                    Email verification logic is currently a backend placeholder.
                  </p>
                )}
              </div>
              <div className="pt-2 flex gap-2">
                {!isEditing ? (
                  <Button onClick={handleEditToggle} className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 shadow-none">
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90">
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                    <Button onClick={handleCancel} variant="outline" disabled={isSaving}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                )}
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
