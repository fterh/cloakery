import { useState } from "react";

export const Register = () => {
  const [username, setUsername] = useState("testuser");
  const [email, setEmail] = useState("test@example.com");
  const [status, setStatus] = useState<{
    msg: string;
    isError: boolean;
  } | null>(null);

  const handleRegister = async () => {
    // Placeholder for registration logic (Phase 3)
    setStatus({
      msg: "Registration logic coming soon in Phase 3",
      isError: false,
    });
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="w-full p-8 bg-slate-800/50 border border-slate-700 rounded-2xl backdrop-blur-sm">
        <h2 className="text-2xl font-bold mb-6 text-white">
          Create your account
        </h2>

        <div className="space-y-4 text-left">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-slate-400 mb-1"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white"
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-400 mb-1"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white"
            />
          </div>
          <button
            type="button"
            onClick={handleRegister}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 font-bold rounded-lg transition-colors text-white"
          >
            Register with Passkey
          </button>
        </div>

        {status && (
          <div
            className={`mt-6 p-4 rounded-lg text-sm font-mono break-all ${
              status.isError
                ? "bg-red-900/30 text-red-400"
                : "bg-green-900/30 text-green-400"
            }`}
          >
            {status.msg}
          </div>
        )}
      </div>
    </div>
  );
};
