import { createContext, useContext } from "react";

/** Supabase auth user id (UUID). Omitted for demo accounts — API then uses email via `x-user-id`. */
export interface User {
  id?: string;
  email: string;
  name: string;
  role: string;
  avatar: string;
  providers?: string[];
}

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string; verificationRequired?: boolean }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<User, "name" | "email">>) => void;
}

/** Single React context instance — must be imported only from this module. */
export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
