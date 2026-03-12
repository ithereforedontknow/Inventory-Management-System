import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Boxes, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

export default function Login() {
  const { user, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err.message || "Invalid credentials");
      toast.error("Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-4">
            <Boxes size={28} className="text-primary" />
          </div>
          <h1 className="text-3xl font-black logo-gradient">StockPilot</h1>
          <p className="text-base-content/40 text-sm font-mono mt-1">
            Inventory OS
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-6 sm:p-8">
          <h2 className="text-xl font-bold mb-6">Sign in</h2>

          {error && (
            <div className="alert alert-error alert-sm mb-4 text-sm py-2">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text text-base-content/70 text-sm">
                  Username
                </span>
              </label>
              <input
                type="text"
                autoComplete="username"
                autoFocus
                className="input input-bordered bg-base-300 focus:border-primary"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text text-base-content/70 text-sm">
                  Password
                </span>
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  className="input input-bordered bg-base-300 focus:border-primary w-full pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content/70"
                  onClick={() => setShowPw((s) => !s)}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full mt-2"
              disabled={loading}
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-base-content/10 text-center text-xs text-base-content/30 font-mono">
            Default: admin / Admin1234
          </div>
        </div>
      </div>
    </div>
  );
}
