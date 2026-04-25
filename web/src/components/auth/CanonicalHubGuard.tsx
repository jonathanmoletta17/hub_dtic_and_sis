"use client";

import { useEffect } from "react";

const INTERNAL_FRONTEND_PORT = "18082";
const CANONICAL_PROXY_PORT = "18080";
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);

export function CanonicalHubGuard() {
  useEffect(() => {
    const { hostname, port, pathname, search, hash, protocol } = window.location;

    if (!LOCAL_HOSTS.has(hostname) || port !== INTERNAL_FRONTEND_PORT) {
      return;
    }

    const canonicalUrl = `${protocol}//${hostname}:${CANONICAL_PROXY_PORT}${pathname}${search}${hash}`;
    window.location.replace(canonicalUrl);
  }, []);

  return null;
}
