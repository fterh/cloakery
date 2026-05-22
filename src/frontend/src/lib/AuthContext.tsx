import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthContextType {
  isLoading: boolean;
  loadMyDetails: () => Promise<void>;
  logout: () => Promise<void>;
  user: User | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMyDetails = useCallback(async () => {
    try {
      const resp = await fetch("/auth/me");
      if (resp.ok) {
        const data = await resp.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Auth refresh failed: ", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMyDetails();
  }, [loadMyDetails]);

  const logout = async () => {
    try {
      await fetch("/auth/logout", { method: "POST" });
      setUser(null);
    } catch (err) {
      console.error("Logout failed: ", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isLoading: loading,
        loadMyDetails: loadMyDetails,
        logout,
        user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
