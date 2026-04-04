/**
 * Single auth entry — `useAuth` and `AuthProvider` share one `AuthContext` from `./auth-context`.
 */
export { AuthProvider } from "./auth-provider";
export { useAuth } from "./auth-context";
export type { User, AuthContextValue } from "./auth-context";
export { AUTH_TOKEN_STORAGE_KEY } from "@/lib/authStorage";
