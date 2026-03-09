import React, { useState } from "react";
import { Lock, Loader2, User } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";

interface ChargerAuthModalProps {
  context: string;
}

export default function ChargerAuthModal({ context }: ChargerAuthModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setActiveContext = useAuthStore((state: any) => state.setActiveContext);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Por favor, preencha usuário e senha.");
      return;
    }

    setLoading(true);
    setError(null);

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? `${window.location.protocol}//${window.location.hostname}:8080` : "http://glpi-backend:8080");

    try {
      const response = await fetch(`${API_BASE}/api/v1/${context}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.detail || "Erro na autenticação. Verifique suas credenciais.");
      }

      const data = await response.json();
      
      // O endpoint "/auth/login" retorna a interface AuthMeResponse incluindo session_token
      setActiveContext(context, data);

    } catch (err: any) {
      setError(err.message || "Erro de conexão com o servidor de autenticação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl">
      <div className="w-full max-w-sm bg-slate-900 border border-white/10 p-8 rounded-3xl shadow-2xl flex flex-col items-center animate-in fade-in zoom-in duration-300">
        
        <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mb-6 ring-4 ring-slate-900 shadow-inner">
          <Lock size={32} />
        </div>
        
        <h2 className="text-2xl font-black text-white text-center tracking-tight leading-tight">
          Acesso Restrito
        </h2>
        <p className="text-sm text-slate-400 text-center mt-2 mb-8">
          Identifique-se com sua conta GLPI para manipular os carregadores do setor SIS.
        </p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Usuário de Rede</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <User size={18} />
              </span>
              <input
                type="text"
                autoFocus
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-white/10 focus:border-blue-500/50 rounded-xl text-white outline-none transition-all placeholder:text-slate-600"
                placeholder="Ex: j.silva"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 mb-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Senha (GLPI)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <Lock size={18} />
              </span>
              <input
                type="password"
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-white/10 focus:border-blue-500/50 rounded-xl text-white outline-none transition-all placeholder:text-slate-600"
                placeholder="Sua senha corporativa"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full h-12 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:shadow-none"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              "Entrar e Iniciar Turno"
            )}
          </button>
        </form>

        {error && (
          <div className="w-full mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl animate-in slide-in-from-top-2">
            <p className="text-xs text-red-400 text-center font-medium">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
