"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import type { PlaybackCommand, PlaybackDevice, PlaybackSession } from "@/types/playback";

type SnapshotResponse = {
  userId: string;
  session: PlaybackSession;
  devices: PlaybackDevice[];
  serverTimeMs: number;
};

export function usePlaybackSession(deviceId: string | null) {
  const [userId, setUserId] = useState<string | null>(null);
  const [session, setSession] = useState<PlaybackSession | null>(null);
  const [devices, setDevices] = useState<PlaybackDevice[]>([]);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isConnected, setIsConnected] = useState(false);
  const sessionRef = useRef<PlaybackSession | null>(null);

  const refreshSnapshot = useCallback(async () => {
    const t0 = Date.now();
    const res = await fetch("/api/playback/session");
    if (!res.ok) return;
    const t1 = Date.now();
    const data = (await res.json()) as SnapshotResponse;
    setUserId(data.userId);
    setSession(data.session);
    sessionRef.current = data.session;
    setDevices(data.devices);
    setServerOffsetMs(data.serverTimeMs - Math.round((t0 + t1) / 2));
  }, []);

  const sendCommand = useCallback(
    async (partial: Omit<PlaybackCommand, "expectedVersion" | "commandId">) => {
      const current = sessionRef.current;
      if (!current || !deviceId) return { ok: false, reason: "not-ready" };

      const command = {
        ...partial,
        expectedVersion: current.state_version,
        commandId: crypto.randomUUID(),
      };

      const post = async () =>
        fetch("/api/playback/session/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(command),
        });

      let res = await post();
      if (res.status === 409) {
        await refreshSnapshot();
        const latest = sessionRef.current;
        if (!latest) return { ok: false, reason: "conflict" };
        res = await fetch("/api/playback/session/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...command, expectedVersion: latest.state_version }),
        });
      }

      if (!res.ok) return { ok: false, reason: `http-${res.status}` };
      const data = await res.json();
      if (data?.session) {
        setSession(data.session);
        sessionRef.current = data.session;
      }
      return { ok: true };
    },
    [deviceId, refreshSnapshot]
  );

  useEffect(() => {
    const init = setTimeout(() => {
      refreshSnapshot().catch(() => {});
    }, 0);
    return () => clearTimeout(init);
  }, [refreshSnapshot]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!userId) return;
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;

    const supabase = createSupabaseBrowserClient();
    let isMounted = true;

    const setup = async () => {
      const tokenRes = await fetch("/api/realtime/token");
      if (!tokenRes.ok) return;
      const { token } = await tokenRes.json();
      await supabase.realtime.setAuth(token);

      const channel = supabase
        .channel(`playback-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "playback_sessions",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const next = payload.new as PlaybackSession;
            if (!isMounted) return;
            setSession(next);
            sessionRef.current = next;
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "devices",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            refreshSnapshot().catch(() => {});
          }
        )
        .subscribe((status) => {
          setIsConnected(status === "SUBSCRIBED");
        });

      return channel;
    };

    let cleanupChannel: { unsubscribe: () => Promise<"ok" | "timed out" | "error"> } | null = null;
    setup().then((channel) => {
      cleanupChannel = channel ?? null;
    });

    return () => {
      isMounted = false;
      if (cleanupChannel) {
        cleanupChannel.unsubscribe().catch(() => {});
      }
    };
  }, [userId, refreshSnapshot]);

  const activeDevice = useMemo(
    () => devices.find((d) => d.id === session?.active_device_id) || null,
    [devices, session?.active_device_id]
  );

  const isThisDeviceActive = !!deviceId && session?.active_device_id === deviceId;
  const remoteMode = !!session && !isThisDeviceActive;

  const effectivePositionMs = useMemo(() => {
    if (!session) return 0;
    if (!session.is_playing) return session.position_ms;
    const nowServer = nowMs + serverOffsetMs;
    const updatedAt = new Date(session.position_updated_at).getTime();
    const delta = Math.max(0, nowServer - updatedAt);
    const rate = Number(session.playback_rate) || 1;
    const predicted = session.position_ms + delta * rate;
    if (typeof session.duration_ms === "number") {
      return Math.min(Math.max(0, predicted), session.duration_ms);
    }
    return Math.max(0, predicted);
  }, [nowMs, serverOffsetMs, session]);

  return {
    userId,
    session,
    devices,
    activeDevice,
    isThisDeviceActive,
    remoteMode,
    effectivePositionMs,
    isConnected,
    refreshSnapshot,
    sendCommand,
  };
}
