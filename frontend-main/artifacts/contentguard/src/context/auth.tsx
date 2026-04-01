import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  email: string;
  name: string;
  role: string;
  avatar: string;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
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

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    await new Promise(r => setTimeout(r, 900));

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

    if (email.includes("@") && password.length >= 6) {
      const name = email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      const userData: User = {
        email,
        name,
        role: "Content Owner",
        avatar: name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
      };
      setUser(userData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      return { success: true };
    }

    return { success: false, error: "Invalid email or password. Please try again." };
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
