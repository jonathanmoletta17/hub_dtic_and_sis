import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { publishLiveDataEvent } from "@/lib/realtime/liveDataBus";
import { useLiveDataRefresh } from "./useLiveDataRefresh";

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
}

describe("useLiveDataRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("coalesces burst updates and refreshes once within throttle window", async () => {
    const onRefresh = vi.fn();

    renderHook(() =>
      useLiveDataRefresh({
        context: "sis",
        domains: ["tickets"],
        onRefresh,
        pollIntervalMs: 0,
        minRefreshGapMs: 500,
      }),
    );

    act(() => {
      publishLiveDataEvent({
        context: "sis-manutencao",
        domains: ["tickets"],
        source: "mutation",
        broadcast: false,
      });
      publishLiveDataEvent({
        context: "sis",
        domains: ["tickets"],
        source: "mutation",
        broadcast: false,
      });
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(600);
      publishLiveDataEvent({
        context: "sis",
        domains: ["tickets"],
        source: "mutation",
        broadcast: false,
      });
    });

    expect(onRefresh).toHaveBeenCalledTimes(2);
  });

  it("queues updates while refresh is in-flight and avoids overlapping calls", async () => {
    const firstRun = createDeferred<void>();
    const onRefresh = vi.fn()
      .mockImplementationOnce(() => firstRun.promise)
      .mockResolvedValue(undefined);

    renderHook(() =>
      useLiveDataRefresh({
        context: "dtic",
        domains: ["tickets"],
        onRefresh,
        pollIntervalMs: 0,
        minRefreshGapMs: 0,
      }),
    );

    act(() => {
      publishLiveDataEvent({
        context: "dtic",
        domains: ["tickets"],
        source: "mutation",
        broadcast: false,
      });
      publishLiveDataEvent({
        context: "dtic",
        domains: ["tickets"],
        source: "mutation",
        broadcast: false,
      });
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);

    await act(async () => {
      firstRun.resolve();
      await Promise.resolve();
    });

    expect(onRefresh).toHaveBeenCalledTimes(2);
  });
});
