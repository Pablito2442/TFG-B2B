"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  LockClosedIcon,
  ArrowRightIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { BRAND } from "@/lib/brand";
import { toast } from "sonner";

const DEMO_ACCOUNTS = [
  { label: "Empresa",       email: "company0@demo.com" },
  { label: "Administrador", email: "admin@demo.com"    },
] as const;

export default function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [loading, setLoading]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Correo requerido", { description: "Introduce tu dirección de correo electrónico." });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Correo no válido", { description: "El formato introducido no corresponde a un correo electrónico." });
      return;
    }
    if (!password) {
      toast.error("Contraseña requerida", { description: "Introduce tu contraseña para continuar." });
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      toast.error("Credenciales incorrectas", {
        description: err instanceof Error ? err.message : "Verifica tu correo y contraseña e inténtalo de nuevo.",
      });
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("Demo1234!");
  }

  return (
    <div className="flex-1 bg-white flex flex-col justify-center items-center p-8 relative border-t-4 border-indigo-600">

      {/* Mobile logo */}
      <div className="lg:hidden absolute top-8 left-8 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" aria-hidden>
            <circle cx="8" cy="8" r="2.5" fill="white" />
            <line x1="8" y1="1" x2="8" y2="5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="8" y1="11" x2="8" y2="15" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="1" y1="8" x2="5" y2="8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="11" y1="8" x2="15" y2="8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <span className="text-lg font-semibold text-gray-900">{BRAND.name}</span>
      </div>

      <div className="w-full max-w-[420px]">

        {/* Header */}
        <div className="mb-10 animate-fade-up" style={{ animationDelay: "100ms" }}>
          <h2 className="text-[32px] font-bold leading-10 tracking-tight text-gray-900 mb-3">
            Bienvenido
          </h2>
          <p className="text-sm text-gray-500">
            Accede con las credenciales de tu empresa para continuar.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1 animate-fade-up" style={{ animationDelay: "250ms" }}>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Correo electrónico
            </label>
            <input
              id="email"
              type="text"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="empresa@demo.com"
              className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-3 text-sm placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1 animate-fade-up" style={{ animationDelay: "350ms" }}>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-3 pr-11 text-sm placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-150"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword
                  ? <EyeSlashIcon className="w-5 h-5" />
                  : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ animationDelay: "450ms" }}
            className="animate-fade-up w-full bg-indigo-600 text-white font-semibold text-sm rounded-lg px-4 py-3 flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 group"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <LockClosedIcon className="w-4 h-4 shrink-0" />
                Iniciar sesión
                <ArrowRightIcon className="w-4 h-4 shrink-0 ml-auto group-hover:translate-x-0.5 transition-transform duration-200" />
              </>
            )}
          </button>
        </form>

        {/* Demo credentials */}
        <div className="mt-12 animate-fade-up" style={{ animationDelay: "600ms" }}>
          <p className="text-[11px] font-bold tracking-[0.08em] uppercase text-gray-400 mb-4">
            Credenciales de demo
          </p>
          <div className="grid grid-cols-2 gap-4">
            {DEMO_ACCOUNTS.map((account) => (
              <div
                key={account.email}
                className="bg-gray-50 border border-gray-200 rounded-lg p-4 transition-all duration-200 cursor-pointer hover:bg-gray-100 hover:border-indigo-200 active:scale-[0.98]"
                onClick={() => fillDemo(account.email)}
              >
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-gray-700">
                    {account.label}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); fillDemo(account.email); }}
                    className="text-gray-400 hover:text-indigo-600 transition-colors flex items-center gap-1"
                  >
                    <ClipboardDocumentIcon className="w-3 h-3" />
                    <span className="text-[9px] uppercase">Usar</span>
                  </button>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-400 font-mono w-4">id</span>
                    <span className="font-mono text-gray-900 truncate text-[11px]">{account.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-400 font-mono w-4">pw</span>
                    <span className="font-mono text-gray-900 text-[11px]">Demo1234!</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="absolute bottom-6 right-8 text-[10px] font-mono text-gray-300 flex items-center gap-3">
        <span>TFG · UBU · 2026</span>
        <span>·</span>
        <span>Datos sintéticos — sin información real de empresas</span>
      </div>
    </div>
  );
}