"use client";

import { useEffect, useMemo, useState } from "react";

function defaultWebDeviceName() {
  const platform = navigator.platform || "";
  if (platform.includes("Mac")) return "MacBook";
  if (platform.includes("Win")) return "Windows PC";
  if (platform.includes("iPhone")) return "iPhone";
  if (platform.includes("Android")) return "Android";
  return "Web Player";
}

export function useDeviceRegistration() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [deviceName] = useState<string>(() =>
    typeof window === "undefined" ? "Web Player" : defaultWebDeviceName()
  );
  const [isReady, setIsReady] = useState(false);

  const deviceKey = useMemo(() => {
    if (typeof window === "undefined") return null;
    const existing = window.localStorage.getItem("playbackDeviceKey");
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.localStorage.setItem("playbackDeviceKey", created);
    return created;
  }, []);

  useEffect(() => {
    if (!deviceKey) return;
    const name = deviceName;

    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let mounted = true;

    const register = async () => {
      const res = await fetch("/api/playback/devices/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceKey,
          deviceType: "web",
          deviceName: name,
          platform: navigator.userAgent,
          appVersion: "web-1.0.0",
        }),
      });

      if (!res.ok) return;
      const data = await res.json();
      if (!mounted) return;

      setDeviceId(data.device.id);
      setIsReady(true);

      heartbeat = setInterval(() => {
        fetch("/api/playback/devices/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId: data.device.id, isOnline: true }),
        }).catch(() => {});
      }, 10000);
    };

    register().catch(() => {});

    return () => {
      mounted = false;
      if (heartbeat) clearInterval(heartbeat);
    };
  }, [deviceKey, deviceName]);

  return { deviceId, deviceName, isReady };
}
