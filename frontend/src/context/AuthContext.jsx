import { createContext, useContext, useState, useEffect } from "react";
import { api } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = not logged in

  useEffect(() => {
    const token = localStorage.getItem("sp_token");
    if (!token) {
      setUser(null);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("sp_token");
        setUser(null);
      });
  }, []);

  async function login(username, password) {
    const res = await api.login({ username, password });
    localStorage.setItem("sp_token", res.token);
    setUser(res.user);
  }

  function logout() {
    localStorage.removeItem("sp_token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
