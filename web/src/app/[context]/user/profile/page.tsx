"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Ticket,
  Mail,
  Building2,
  MapPin,
  Phone,
  Shield,
  BarChart3,
  Clock,
  CheckCircle2,
} from "lucide-react";

const contextData: Record<string, { color: string; accentClass: string }> = {
  "dtic": { color: "text-accent-blue", accentClass: "bg-accent-blue" },
  "sis-manutencao": { color: "text-accent-orange", accentClass: "bg-accent-orange" },
  "sis-memoria": { color: "text-accent-violet", accentClass: "bg-accent-violet" },
};

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const context = params.context as string;
  const current = contextData[context] || contextData["dtic"];

  const user = {
    name: "Jonathan Moletta",
    username: "jonathan.moletta",
    email: "jonathan.moletta@casacivil.rs.gov.br",
    department: "DTIC — Tecnologia da Informação",
    role: "Analista de TI",
    location: "Palácio Piratini — Porto Alegre, RS",
    phone: "(51) 3210-4000",
    access: "Super-Admin",
  };

  const stats = [
    { label: "Tickets Abertos", value: "3", icon: <Ticket size={16} /> },
    { label: "Resolvidos (mês)", value: "12", icon: <CheckCircle2 size={16} /> },
    { label: "Tempo Médio", value: "4.2h", icon: <Clock size={16} /> },
    { label: "Satisfação", value: "98%", icon: <BarChart3 size={16} /> },
  ];

  const infoItems = [
    { icon: <Mail size={15} />, label: "E-mail", value: user.email },
    { icon: <Building2 size={15} />, label: "Departamento", value: user.department },
    { icon: <MapPin size={15} />, label: "Localização", value: user.location },
    { icon: <Phone size={15} />, label: "Telefone", value: user.phone },
    { icon: <Shield size={15} />, label: "Nível de Acesso", value: user.access },
  ];

  return (
        <div className="flex flex-col h-full px-5 lg:px-8 py-5">
          <header className="mb-6 shrink-0">
            <h1 className="text-xl lg:text-2xl font-semibold text-text-1 tracking-tight">Meu Perfil</h1>
            <p className="text-text-2/50 text-[14px] mt-0.5">Informações da sua conta</p>
          </header>

          <div className="flex-grow min-h-0 overflow-y-auto pr-1" style={{ scrollbarWidth: "none" }}>
            {/* Avatar + Name */}
            <div className="flex items-center gap-5 mb-8">
              <div className={`w-16 h-16 rounded-2xl ${current.accentClass}/10 flex items-center justify-center`}>
                <span className={`text-xl font-bold ${current.color}`}>JM</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text-1">{user.name}</h2>
                <p className="text-[14px] text-text-2/60">{user.role}</p>
                <p className="text-[12px] text-text-3/40 font-mono mt-0.5">@{user.username}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
              {stats.map((stat, idx) => (
                <div key={idx} className="bg-surface-2 border border-white/[0.06] rounded-lg px-4 py-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-3/50">{stat.label}</span>
                    <div className="text-text-3/30">{stat.icon}</div>
                  </div>
                  <div className="text-xl font-semibold text-text-1 font-mono tracking-tighter">{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Info */}
            <div className="space-y-0">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-3/50 mb-3">Informações</h3>
              {infoItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3.5 py-3.5 border-b border-white/[0.04] last:border-0">
                  <div className="text-text-3/40">{item.icon}</div>
                  <div className="flex-grow min-w-0">
                    <span className="text-[11px] uppercase tracking-wider text-text-3/40 block">{item.label}</span>
                    <span className="text-[14px] text-text-2">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

    </div>
  );
}
