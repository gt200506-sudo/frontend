import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { setUserIdGetter } from "@workspace/api-client-react";

interface User {
  email: string;
  name: string;
  role: string;
  avatar: string;
  providers?: string[];
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string; verificationRequired?: boolean }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

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
      email: sbUser.email || "",
      name: full_name,
      role: sbUser.user_metadata?.role || "Content Owner",
      avatar: full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
      providers: sbUser.app_metadata?.providers || [],
    };
  };

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(mapSupabaseUser(session.user));
      } else {
        // Fallback to local storage for demo purposes if no supabase session
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

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(mapSupabaseUser(session.user));
        localStorage.removeItem(STORAGE_KEY); // Prefer Supabase session
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Update API client with current user ID for data isolation
    setUserIdGetter(() => user?.email || null);
  }, [user]);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Try demo credentials first to maintain existing behavior
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
      return { success: true };
    }

    // Otherwise use Supabase
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };

    // user state will be updated by onAuthStateChange
    return { success: true };
  };

  const signUp = async (email: string, password: string): Promise<{ success: boolean; error?: string; verificationRequired?: boolean }> => {
    const { data: { user: sbUser }, error } = await supabase.auth.signUp({ email, password });
    if (error) return { success: false, error: error.message };
    
    // If user is returned but no session, verification is likely required
    const { data: { session } } = await supabase.auth.getSession();
    const verificationRequired = !!sbUser && !session;
    
    return { success: true, verificationRequired };
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    // If demo email, just simulate success
    const match = DEMO_CREDENTIALS.find(c => c.email.toLowerCase() === email.toLowerCase());
    if (match) {
      return { success: true };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`, // This would be the next step
    });
    
    if (error) return { success: false, error: error.message };
    return { success: true };
  };


  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      signIn,
      signUp,
      resetPassword,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
