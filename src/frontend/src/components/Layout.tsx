import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Glows } from "./Glows";

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const isRegister = location.pathname === "/register";

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden font-sans selection:bg-blue-500 selection:text-white bg-slate-900 text-slate-100">
      <Glows />

      <header
        className={`w-full max-w-6xl mx-auto px-6 py-6 flex ${isRegister ? "justify-center" : "justify-between"} items-center z-10`}
      >
        <Link to="/" className="text-2xl font-bold tracking-tight text-white">
          Cloakery
        </Link>
        {!isRegister && (
          <Link
            to="/register"
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            Register
          </Link>
        )}
      </header>

      <main className="flex-grow flex flex-col items-center justify-center px-6 relative z-10 w-full max-w-4xl mx-auto text-center">
        {children}
      </main>
    </div>
  );
};
