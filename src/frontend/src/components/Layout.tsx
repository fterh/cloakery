import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { Glows } from "./Glows";

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isRegister = location.pathname === "/register";
  const isLogin = location.pathname === "/login";
  const isAuthPage = isRegister || isLogin;

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden font-sans selection:bg-blue-500 selection:text-white bg-slate-900 text-slate-100">
      <Glows />

      <header
        className={`w-full max-w-6xl mx-auto px-6 py-6 flex ${isAuthPage ? "justify-center" : "justify-between"} items-center z-10`}
      >
        <Link to="/" className="text-2xl font-bold tracking-tight text-white">
          Cloakery
        </Link>
        {!isAuthPage && (
          <div className="flex gap-4 items-center">
            {isLoading ? (
              <div className="h-9 w-24 bg-slate-800/50 rounded-lg animate-pulse" />
            ) : user ? (
              <>
                <span className="text-sm text-slate-400">
                  Hi,{" "}
                  <span className="text-white font-medium">
                    {user.username}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        )}
      </header>

      <main className="flex-grow flex flex-col items-center justify-center px-6 relative z-10 w-full max-w-4xl mx-auto text-center">
        {children}
      </main>
    </div>
  );
};
