import { useAuth } from "../lib/AuthContext";

export const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="w-full max-w-4xl mx-auto text-left py-12">
      <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
      <p className="text-slate-400 mb-8">
        Welcome back, {user?.username}. Manage your cloaked email addresses
        here.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-2xl backdrop-blur-sm">
          <div className="text-2xl font-bold text-white mb-1">0</div>
          <div className="text-sm text-slate-400">Active Aliases</div>
        </div>
        <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-2xl backdrop-blur-sm">
          <div className="text-2xl font-bold text-white mb-1">0</div>
          <div className="text-sm text-slate-400">Emails Forwarded</div>
        </div>
        <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-2xl backdrop-blur-sm">
          <div className="text-2xl font-bold text-white mb-1">0</div>
          <div className="text-sm text-slate-400">Spam Blocked</div>
        </div>
      </div>

      <div className="p-8 bg-slate-800/50 border border-slate-700 rounded-2xl backdrop-blur-sm text-center">
        <div className="mb-4 text-slate-400 italic">
          No aliases created yet.
        </div>
        <button
          type="button"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 font-bold rounded-lg transition-colors text-white"
        >
          Create New Alias
        </button>
      </div>
    </div>
  );
};
