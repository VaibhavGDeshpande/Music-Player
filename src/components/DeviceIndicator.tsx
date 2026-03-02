"use client";

type Props = {
  remoteMode: boolean;
  activeDeviceName: string | null;
  onOpen: () => void;
};

export default function DeviceIndicator({ remoteMode, activeDeviceName, onOpen }: Props) {
  return (
    <button
      onClick={onOpen}
      className={`text-xs rounded-full border px-3 py-1.5 transition ${
        remoteMode
          ? "border-amber-500/60 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20"
          : "border-neutral-600 text-neutral-200 bg-neutral-900 hover:bg-neutral-800"
      }`}
      title="Select playback device"
    >
      {remoteMode ? `Playing on ${activeDeviceName || "another device"}` : "Playing on This Device"}
    </button>
  );
}

