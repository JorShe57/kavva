import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface User {
  id: number;
  username: string;
  email: string; // Added email to the User interface
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>; // Added email to register function signature
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, navigate] = useLocation();

  // Debounce function
  const debounce = (func: any, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        func.apply(this, args);
      }, wait);
    };
  };

  useEffect(() => {
    // Check if user is logged in - Debounced
    const debouncedCheckAuthStatus = debounce(async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
        });

        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        }
      } catch (err) {
        console.error("Authentication check failed:", err);
      } finally {
        setLoading(false);
      }
    }, 1000);

    debouncedCheckAuthStatus();
  }, []);

  const login = async (username: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiRequest("POST", "/api/auth/login", { username, password });
      const userData = await res.json();
      setUser(userData);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string) => { // Added email parameter
    setLoading(true);
    setError(null);

    try {
      const res = await apiRequest("POST", "/api/auth/register", { username, email, password }); // Added email to request body
      const userData = await res.json();
      setUser(userData);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);

    try {
      await apiRequest("POST", "/api/auth/logout", {});
      setUser(null);
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}