// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import { login as apiLogin, register as apiRegister } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("auditai_token");
    const saved = localStorage.getItem("auditai_user");
    if (token && saved) {
      try { setUser(JSON.parse(saved)); } catch {}
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const data = await apiLogin(email, password);
    localStorage.setItem("auditai_token", data.access_token);
    const userObj = { email };
    localStorage.setItem("auditai_user", JSON.stringify(userObj));
    setUser(userObj);
    return data;
  };

  const register = async (email, password, orgName) => {
    const data = await apiRegister(email, password, orgName);
    localStorage.setItem("auditai_token", data.access_token);
    const userObj = { email, orgName };
    localStorage.setItem("auditai_user", JSON.stringify(userObj));
    setUser(userObj);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("auditai_token");
    localStorage.removeItem("auditai_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
