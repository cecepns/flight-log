import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { decodeJwtUser } from "../utils/jwtUser";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("flight-log-token");
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get("/me")
      .then((res) => {
        const next = {
          id: res.data.id,
          email: res.data.email,
          fullName: res.data.full_name,
        };
        setUser(next);
        localStorage.setItem("flight-log-user-cache", JSON.stringify(next));
      })
      .catch((error) => {
        const status = error.response?.status;
        if (status === 401 || status === 404) {
          localStorage.removeItem("flight-log-token");
          localStorage.removeItem("flight-log-user-cache");
          setUser(null);
          return;
        }
        const cached = (() => {
          try {
            return JSON.parse(localStorage.getItem("flight-log-user-cache") || "null");
          } catch {
            return null;
          }
        })();
        const fromJwt = decodeJwtUser(token);
        if (cached?.id && cached?.email) {
          setUser(cached);
        } else if (fromJwt) {
          setUser(fromJwt);
        } else {
          localStorage.removeItem("flight-log-token");
          setUser(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("flight-log-token", data.token);
    const next = {
      id: data.user.id,
      email: data.user.email,
      fullName: data.user.fullName,
    };
    setUser(next);
    localStorage.setItem("flight-log-user-cache", JSON.stringify(next));
  };

  const logout = () => {
    localStorage.removeItem("flight-log-token");
    localStorage.removeItem("flight-log-user-cache");
    setUser(null);
  };

  const updateUserProfile = (nextUser) => {
    setUser((prev) => ({
      ...prev,
      ...nextUser,
    }));
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      logout,
      updateUserProfile,
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
