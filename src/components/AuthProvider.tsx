"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://vora-52k9.onrender.com";

interface User {
  id: number;
  username: string;
  display_name: string;
  is_demo_account: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isWakingUp: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWakingUp, setIsWakingUp] = useState(false);
  const router = useRouter();

  const fetchUser = async () => {
    // Detect if backend is cold starting by triggering a wakeup warning after 1.5 seconds of delay
    const wakeupTimer = setTimeout(() => {
      setIsWakingUp(true);
    }, 1500);

    try {
      const res = await fetch(`${BACKEND_URL}/auth/me`, {
        credentials: "include",
      });
      clearTimeout(wakeupTimer);
      setIsWakingUp(false);

      if (res.ok) {
        const data = await res.json();
        setUser(data);
        // Set frontend-domain cookie so that Next.js middleware knows the user is authenticated
        document.cookie = "session_token=true; path=/; max-age=31536000; SameSite=Lax";
      } else {
        setUser(null);
        // Clear frontend-domain cookie if session is invalid
        document.cookie = "session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
      }
    } catch (err) {
      clearTimeout(wakeupTimer);
      setIsWakingUp(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fire-and-forget background fetch to /ping to wake up Render instance as early as possible
    fetch(`${BACKEND_URL}/ping`).catch(() => {});
    
    fetchUser();
  }, []);

  const logout = async () => {
    try {
      await fetch(`${BACKEND_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
      // Clear frontend-domain cookie
      document.cookie = "session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Failed to log out:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isWakingUp, logout, refreshUser: fetchUser }}>
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
