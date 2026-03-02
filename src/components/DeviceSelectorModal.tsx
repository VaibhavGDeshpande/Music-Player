"use client";

import type { PlaybackDevice } from "@/types/playback";

type Props = {
  isOpen: boolean;
  devices: PlaybackDevice[];
  activeDeviceId: string | null;
  currentDeviceId: string | null;
  onClose: () => void;
  onSwitch: (targetDeviceId: string) => void;
  switchingId: string | null;
};

export default function DeviceSelectorModal({
  isOpen,
  devices,
  activeDeviceId,
  currentDeviceId,
  onClose,
  onSwitch,
  switchingId,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-2xl p-4 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white text-sm font-semibold">Connect to a device</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-white text-sm">
            Close
          </button>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {devices.map((device) => {
            const isActive = device.id === activeDeviceId;
            const isCurrent = device.id === currentDeviceId;
            const isSwitching = switchingId === device.id;

            return (
              <button
                key={device.id}
                onClick={() => onSwitch(device.id)}
                disabled={isSwitching}
                className={`w-full text-left rounded-xl border px-3 py-2 transition ${
                  isActive
                    ? "border-green-500/60 bg-green-500/10"
                    : "border-neutral-700 bg-neutral-800/70 hover:bg-neutral-800"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-white font-medium">{device.device_name}</p>
                    <p className="text-xs text-neutral-400">
                      {isCurrent ? "This device" : device.device_type.toUpperCase()}
                      {device.is_online ? " • Online" : " • Offline"}
                    </p>
                  </div>
                  <div className="text-xs">
                    {isSwitching ? (
                      <span className="text-neutral-300">Switching...</span>
                    ) : isActive ? (
                      <span className="text-green-400">Current</span>
                    ) : (
                      <span className="text-neutral-300">Play here</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
          {devices.length === 0 && (
            <div className="text-sm text-neutral-400 py-6 text-center">No devices found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

