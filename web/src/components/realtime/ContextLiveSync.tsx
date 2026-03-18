"use client";

import { useEffect, useRef } from "react";

import { buildApiPath, resolveRootContext } from "@/lib/api/client";
import {
  inferDomainsFromSsePayload,
  publishLiveDataEvent,
} from "@/lib/realtime/liveDataBus";

const HEARTBEAT_TIMEOUT_MS = 90_000;
const INITIAL_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const FALLBACK_POLL_INTERVAL_MS = 120_000;

export function ContextLiveSync({ context }: { context: string }) {
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const heartbeatTimerRef = useRef<number | null>(null);
  const streamRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const normalizedContext = resolveRootContext(context);
    if (!normalizedContext || typeof window === "undefined") {
      return;
    }

    let closed = false;
    const streamUrl = buildApiPath(normalizedContext, "events/stream");

    const clearReconnect = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const clearHeartbeat = () => {
      if (heartbeatTimerRef.current !== null) {
        window.clearTimeout(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };

    const closeStream = () => {
      if (streamRef.current) {
        streamRef.current.close();
        streamRef.current = null;
      }
      clearHeartbeat();
    };

    const scheduleReconnect = () => {
      if (closed) {
        return;
      }

      clearReconnect();
      const attempt = reconnectAttemptRef.current + 1;
      reconnectAttemptRef.current = attempt;
      const baseDelay = Math.min(
        INITIAL_RECONNECT_DELAY_MS * (2 ** (attempt - 1)),
        MAX_RECONNECT_DELAY_MS,
      );
      const jitter = Math.floor(Math.random() * 500);

      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, baseDelay + jitter);
    };

    const resetHeartbeat = () => {
      clearHeartbeat();
      heartbeatTimerRef.current = window.setTimeout(() => {
        closeStream();
        scheduleReconnect();
      }, HEARTBEAT_TIMEOUT_MS);
    };

    const connect = () => {
      if (closed) {
        return;
      }

      closeStream();
      const stream = new EventSource(streamUrl, { withCredentials: true });
      streamRef.current = stream;

      stream.onopen = () => {
        reconnectAttemptRef.current = 0;
        clearReconnect();
        resetHeartbeat();
      };

      stream.onmessage = (event) => {
        resetHeartbeat();
        try {
          const payload = JSON.parse(event.data) as Record<string, unknown>;
          const domains = inferDomainsFromSsePayload(payload);
          if (domains.length === 0) {
            return;
          }

          publishLiveDataEvent({
            context: normalizedContext,
            domains,
            source: "sse",
            reason: "backend-stream",
            broadcast: false,
          });
        } catch {
          // ignore malformed event payload
        }
      };

      stream.onerror = () => {
        closeStream();
        scheduleReconnect();
      };
    };

    connect();

    const fallbackTimer = window.setInterval(() => {
      publishLiveDataEvent({
        context: normalizedContext,
        domains: ["tickets", "analytics", "knowledge", "permissions", "chargers", "dashboard", "search", "user"],
        source: "polling",
        reason: "sse-fallback",
        broadcast: false,
      });
    }, FALLBACK_POLL_INTERVAL_MS);

    return () => {
      closed = true;
      window.clearInterval(fallbackTimer);
      clearReconnect();
      closeStream();
    };
  }, [context]);

  return null;
}
