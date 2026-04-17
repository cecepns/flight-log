import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/client";

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
        setUser({
          id: res.data.id,
          email: res.data.email,
          fullName: res.data.full_name,
        });
      })
      .catch(() => {
        localStorage.removeItem("flight-log-token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("flight-log-token", data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("flight-log-token");
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
