export type DeviceType = "web" | "flutter";

export type PlaybackDevice = {
  id: string;
  user_id: string;
  device_key: string;
  device_name: string;
  device_type: DeviceType;
  platform: string | null;
  app_version: string | null;
  is_online: boolean;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
};

export type PlaybackSession = {
  id: string;
  user_id: string;
  active_device_id: string | null;
  track_id: string | null;
  track_title: string | null;
  artist_name: string | null;
  cover_url: string | null;
  stream_url: string | null;
  is_playing: boolean;
  position_ms: number;
  duration_ms: number | null;
  playback_rate: number;
  position_updated_at: string;
  state_version: number;
  last_command_id: string | null;
  updated_by_device_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PlaybackCommandType =
  | "PLAY"
  | "PAUSE"
  | "SEEK"
  | "SWITCH_DEVICE"
  | "SYNC_POSITION";

export type PlaybackCommand = {
  type: PlaybackCommandType;
  deviceId: string;
  commandId: string;
  expectedVersion: number;
  positionMs?: number;
  playbackRate?: number;
  targetDeviceId?: string;
  track?: {
    id: string;
    title: string;
    artist: string;
    cover?: string;
    streamUrl: string;
    durationMs?: number;
  };
};

