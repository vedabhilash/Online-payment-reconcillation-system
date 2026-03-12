import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { api } from "@/lib/api";

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: 'ADMIN' | 'CUSTOMER';
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    api.me()
      .then((data) => setUser(data))
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  const signOut = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  // expose a login helper so Auth page can set user after login/signup
  const handleAuthSuccess = (token: string, userData: AuthUser) => {
    localStorage.setItem("token", token);
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// small helper used in Auth.tsx
export function useAuthActions() {
  const [, setUser] = useState<AuthUser | null>(null);
  const login = (token: string, userData: AuthUser) => {
    localStorage.setItem("token", token);
    setUser(userData);
    // Force page reload to re-run AuthProvider effect
    window.location.href = "/";
  };
  return { login };
}
