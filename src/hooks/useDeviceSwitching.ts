"use client";

import { useCallback } from "react";

export function useDeviceSwitching(deviceId: string | null, expectedVersion: number | null) {
  const switchDevice = useCallback(
    async (targetDeviceId: string) => {
      if (!deviceId || typeof expectedVersion !== "number") {
        return { ok: false, reason: "not-ready" };
      }

      const res = await fetch("/api/playback/session/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "SWITCH_DEVICE",
          deviceId,
          targetDeviceId,
          expectedVersion,
          commandId: crypto.randomUUID(),
        }),
      });
      return { ok: res.ok, reason: res.ok ? undefined : `http-${res.status}` };
    },
    [deviceId, expectedVersion]
  );

  return { switchDevice };
}
