"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { BeakerIcon, LockClosedIcon } from "@heroicons/react/24/solid";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--primary-dim)] border border-[oklch(0.60_0.128_158/0.22)] mb-4">
            <BeakerIcon className="w-7 h-7 text-[var(--primary)]" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">B2B Graph Intel</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Accede con las credenciales de tu empresa</p>
        </div>

        {/* Card */}
        <div className="bg-[oklch(0.11_0_0)] border border-white/[0.10] rounded-2xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="empresa@demo.com"
                className="w-full bg-[var(--bg-base)] border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary-dim)] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[var(--bg-base)] border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary-dim)] transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[var(--primary)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-2.5 text-sm transition-all"
            >
              <LockClosedIcon className="w-4 h-4" />
              {loading ? "Iniciando sesión…" : "Iniciar sesión"}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-6 pt-5 border-t border-white/[0.07]">
            <p className="text-xs text-[var(--text-muted)] text-center mb-2">Credenciales de demo</p>
            <div className="bg-[var(--bg-base)] rounded-lg px-4 py-3 font-mono text-xs text-[var(--text-secondary)] space-y-1">
              <div><span className="text-[var(--text-muted)]">email:</span> company0@demo.com</div>
              <div><span className="text-[var(--text-muted)]">pass:</span>  Demo1234!</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
