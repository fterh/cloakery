import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../lib/AuthContext";

interface Alias {
  id: string;
  alias: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export const Dashboard = () => {
  const { user } = useAuth();
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAliasName, setNewAliasName] = useState("");
  const [newAliasDesc, setNewAliasDesc] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchAliases = useCallback(async () => {
    try {
      const resp = await fetch("/aliases");
      if (resp.ok) {
        const data = await resp.json();
        setAliases(data);
      }
    } catch (err) {
      console.error("Failed to fetch aliases", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAliases();
  }, [fetchAliases]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const resp = await fetch("/aliases", {
        method: "POST",
        body: JSON.stringify({
          alias: newAliasName,
          description: newAliasDesc,
        }),
      });
      if (resp.ok) {
        setNewAliasName("");
        setNewAliasDesc("");
        fetchAliases();
      } else {
        const data = await resp.json();
        setError(data.error || "Failed to create alias");
      }
    } catch {
      setError("Network error");
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      const resp = await fetch(`/aliases/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (resp.ok) fetchAliases();
    } catch (err) {
      console.error("Failed to toggle", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      const resp = await fetch(`/aliases/${id}`, { method: "DELETE" });
      if (resp.ok) fetchAliases();
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  const activeCount = aliases.filter((a) => a.is_active).length;

  return (
    <div className="w-full max-w-4xl mx-auto text-left py-12">
      <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
      <p className="text-slate-400 mb-8">
        Welcome back, {user?.username}. Manage your cloaked email addresses
        here.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-2xl backdrop-blur-sm">
          <div className="text-2xl font-bold text-white mb-1">
            {activeCount}
          </div>
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

      {/* Rudimentary Create Form */}
      <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-2xl mb-8">
        <h2 className="text-xl font-bold text-white mb-4">Create Alias</h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Alias name"
            className="p-2 rounded bg-slate-900 border border-slate-700 text-white"
            value={newAliasName}
            onChange={(e) => setNewAliasName(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Description (optional)"
            className="p-2 rounded bg-slate-900 border border-slate-700 text-white"
            value={newAliasDesc}
            onChange={(e) => setNewAliasDesc(e.target.value)}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 rounded font-bold text-white"
          >
            Create
          </button>
          {error && <div className="text-red-500 text-sm">{error}</div>}
        </form>
      </div>

      {/* Rudimentary Alias List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-white text-center">Loading...</div>
        ) : aliases.length === 0 ? (
          <div className="text-slate-400 text-center italic py-8">
            No aliases yet.
          </div>
        ) : (
          aliases.map((a) => (
            <div
              key={a.id}
              className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl flex justify-between items-center"
            >
              <div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-white font-mono font-bold text-lg">
                    {a.alias}
                  </span>
                  <span className="text-slate-500 font-medium">
                    @{user?.username}.cloakery.io
                  </span>
                </div>
                <div className="text-slate-400 text-sm">{a.description}</div>
              </div>
              <div className="flex items-center gap-6">
                <button
                  type="button"
                  onClick={() => handleToggle(a.id, a.is_active)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    a.is_active ? "bg-blue-600" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      a.is_active ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(a.id)}
                  className="p-2 text-slate-500 hover:text-red-500 transition-colors"
                  title="Delete alias"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <title>Delete</title>
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
