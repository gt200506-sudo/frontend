import { useState, useEffect, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { AUTH_TOKEN_STORAGE_KEY } from "@/lib/authStorage";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { setAuthTokenGetter, setUserIdGetter } from "@workspace/api-client-react";
import { AuthContext, type User } from "./auth-context";

const STORAGE_KEY = "contentguard_auth";

const DEMO_CREDENTIALS = [
  { email: "demo@contentguard.io", password: "demo1234", name: "Alex Morgan", role: "IP Analyst" },
  { email: "admin@contentguard.io", password: "admin1234", name: "Sam Rivera", role: "Platform Admin" },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const mapSupabaseUser = (sbUser: SupabaseUser): User => {
    const full_name = sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || sbUser.email?.split("@")[0] || "User";
    return {
      id: sbUser.id,
      email: sbUser.email || "",
      name: full_name,
      role: sbUser.user_metadata?.role || "Content Owner",
      avatar: full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
      providers: sbUser.app_metadata?.providers || [],
    };
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        if (session.access_token) {
          localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, session.access_token);
        }
        setUser(mapSupabaseUser(session.user));
      } else {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            setUser(JSON.parse(stored));
          } catch {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        if (session.access_token) {
          localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, session.access_token);
        }
        setUser(mapSupabaseUser(session.user));
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem(AUTH_TOKEN_STORAGE_KEY));
    setUserIdGetter(() => user?.email ?? user?.id ?? null);
  }, [user]);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const match = DEMO_CREDENTIALS.find(c => c.email.toLowerCase() === email.toLowerCase() && c.password === password);
    if (match) {
      const userData: User = {
        email: match.email,
        name: match.name,
        role: match.role,
        avatar: match.name.split(" ").map(n => n[0]).join(""),
      };
      setUser(userData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, `demo.${match.email}`);
      return { success: true };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };

    if (data.session?.access_token) {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, data.session.access_token);
    }
    return { success: true };
  };

  const signUp = async (email: string, password: string): Promise<{ success: boolean; error?: string; verificationRequired?: boolean }> => {
    const { data: { user: sbUser }, error } = await supabase.auth.signUp({ email, password });
    if (error) return { success: false, error: error.message };

    const { data: { session } } = await supabase.auth.getSession();
    const verificationRequired = !!sbUser && !session;

    return { success: true, verificationRequired };
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const match = DEMO_CREDENTIALS.find(c => c.email.toLowerCase() === email.toLowerCase());
    if (match) {
      return { success: true };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  };

  const updateProfile = (updates: Partial<Pick<User, "name" | "email">>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next: User = {
        ...prev,
        ...updates,
        avatar: (updates.name ?? prev.name)
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        signIn,
        signUp,
        resetPassword,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
