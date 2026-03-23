import { useState, useCallback } from "react";

interface User {
  name: string;
  email: string;
  avatar?: string;
  role: "admin" | "user";
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

const STORAGE_KEY = "admin_auth";

function getStoredAuth(): AuthState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore parse errors
  }

  // Return a mock authenticated state for demo purposes
  return {
    user: {
      name: "Admin User",
      email: "admin@example.com",
      role: "admin",
    },
    token: "demo-token",
    isAuthenticated: true,
  };
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>(getStoredAuth);

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      try {
        // Replace with real API call
        // const response = await api.post('/auth/login', { email, password });

        // Mock successful login
        const newAuth: AuthState = {
          user: {
            name: "Admin User",
            email,
            role: "admin",
          },
          token: "mock-jwt-token",
          isAuthenticated: true,
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(newAuth));
        setAuth(newAuth);

        // Suppress unused variable warning in demo
        void password;

        return true;
      } catch (error) {
        console.error("Login failed:", error);
        return false;
      }
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAuth({
      user: null,
      token: null,
      isAuthenticated: false,
    });
    window.location.href = "/login";
  }, []);

  const updateUser = useCallback(
    (updates: Partial<User>) => {
      if (!auth.user) return;

      const updatedAuth: AuthState = {
        ...auth,
        user: { ...auth.user, ...updates },
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAuth));
      setAuth(updatedAuth);
    },
    [auth]
  );

  return {
    user: auth.user,
    token: auth.token,
    isAuthenticated: auth.isAuthenticated,
    login,
    logout,
    updateUser,
  };
}
