import { createContext, useContext, useEffect, useState } from "react";
import { login as loginApi, logout as logoutApi } from "../api/endpoints";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("apmc_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      localStorage.setItem("apmc_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("apmc_user");
    }
  }, [user]);

  async function login(username, password) {
    setLoading(true);
    setError(null);
    try {
      const data = await loginApi(username, password);
      const token = data.access_token ?? data.token;
      const userData = data.user ?? data.profile ?? data;

      if (!token) {
        throw new Error("No access token returned by the server.");
      }

      localStorage.setItem("apmc_token", token);
      setUser(userData);
      return userData;
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Login failed. Please try again.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    // Best-effort: close the login-history session row server-side. Never
    // block the client-side sign-out on this -- an expired/invalid token
    // failing here shouldn't stop the user from logging out locally.
    logoutApi().catch(() => {});
    localStorage.removeItem("apmc_token");
    localStorage.removeItem("apmc_user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
