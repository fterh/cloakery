import { startRegistration } from "@simplewebauthn/browser";
import { useState } from "react";

export const Register = () => {
  const [username, setUsername] = useState("testuser");
  const [email, setEmail] = useState("test@example.com");
  const [status, setStatus] = useState<{
    msg: string;
    isError: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const setFeedback = (msg: string, isError = false) => {
    setStatus({ msg, isError });
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      setFeedback("Fetching options...");

      // 1. Get options from server
      const respOptions = await fetch("/auth/register/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email }),
      });

      if (!respOptions.ok) {
        const error = await respOptions.json();
        throw new Error(error.error || "Failed to fetch options");
      }

      const options = await respOptions.json();
      setFeedback("Options received. Signature requested...");

      // 2. Start WebAuthn Registration
      const attestationResponse = await startRegistration({
        optionsJSON: options,
      });
      setFeedback("Signature generated. Verifying...");

      // 3. Send response back to server
      const respVerify = await fetch("/auth/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, response: attestationResponse }),
      });

      if (!respVerify.ok) {
        const error = await respVerify.json();
        throw new Error(error.error || "Verification failed");
      }

      setFeedback("Registration successful! Your account is ready.");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unknown error occurred";
      console.error(err);
      setFeedback(`Error: ${message}`, true);
    } finally {
      setLoading(false);
    }
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
              disabled={loading}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white disabled:opacity-50"
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
              disabled={loading}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white disabled:opacity-50"
            />
          </div>
          <button
            type="button"
            onClick={handleRegister}
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 font-bold rounded-lg transition-colors text-white disabled:bg-blue-800 disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : "Register with Passkey"}
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
