"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

import { LoginSurface } from "@/app/_components/LoginSurface";
import { bootstrapContextSessions } from "@/lib/auth/contextSessionBootstrap";
import { apiLogin, GlpiApiError } from "@/lib/api/glpiService";
import { useAuthStore } from "@/store/useAuthStore";

function writeSessionCookie(sessionToken?: string) {
  if (!sessionToken) return;
  document.cookie = `sessionToken=${sessionToken}; path=/; max-age=86400; samesite=strict`;
}

function normalizeNetworkUsername(value: string) {
  return value.trim().toLowerCase();
}

export default function LoginPage() {
  const router = useRouter();
  const { login, cacheContextSession } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const persistSessions = (sessions: Record<string, Awaited<ReturnType<typeof apiLogin>>>) => {
    for (const [context, identity] of Object.entries(sessions)) {
      cacheContextSession(context, identity);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    const normalizedUsername = normalizeNetworkUsername(username);
    setLoading(true);
    setErrorMsg("");

    try {
      const response = await apiLogin("dtic", { username: normalizedUsername, password });
      const sessions = await bootstrapContextSessions(normalizedUsername, password, "dtic", response);
      login(normalizedUsername, password);
      persistSessions(sessions);
      writeSessionCookie(response.session_token);
      router.push("/selector");
    } catch (errDtic: unknown) {
      if (errDtic instanceof GlpiApiError && errDtic.status === 401) {
        try {
          const response = await apiLogin("sis", { username: normalizedUsername, password });
          const sessions = await bootstrapContextSessions(normalizedUsername, password, "sis", response);
          login(normalizedUsername, password);
          persistSessions(sessions);
          writeSessionCookie(response.session_token);
          router.push("/selector");
        } catch {
          setErrorMsg("Login invalido. Use seu usuario de rede no formato nome-sobrenome.");
        }
      } else {
        setErrorMsg("Erro de comunicacao com o servidor de autenticacao.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginSurface
      username={username}
      password={password}
      loading={loading}
      errorMsg={errorMsg}
      onUsernameChange={(value) => setUsername(normalizeNetworkUsername(value))}
      onPasswordChange={setPassword}
      onSubmit={handleSubmit}
    />
  );
}
