"use client";

import { usePlayer } from "@/contexts/PlayerContext";

export default function Player() {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    nextTrack,
    prevTrack,
    currentTime,
    duration,
    seek,
    loopMode,
    toggleLoop
  } = usePlayer();

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  if (!currentTrack) return null;

  return (
    <>
      {/* DESKTOP PLAYER */}
      <div className="hidden md:flex fixed bottom-0 left-0 md:left-64 right-0 bg-black border-t border-neutral-800 p-4 z-40 items-center justify-between">
        
        <div className="flex items-center gap-4 w-1/3">
          <img src={currentTrack.cover} className="w-14 h-14 rounded-md" />
          <div>
            <h4 className="text-white text-sm font-bold">{currentTrack.title}</h4>
            <p className="text-neutral-400 text-xs">{currentTrack.artist}</p>
          </div>
        </div>

        <div className="flex flex-col items-center max-w-[45%] w-full">
          <div className="flex gap-6 mb-2 items-center">

            <button
  onClick={toggleLoop}
  className="relative flex items-center justify-center"
  title={
    loopMode === "off"
      ? "Repeat Off"
      : loopMode === "all"
      ? "Repeat All"
      : "Repeat One"
  }
>
  <span
    className={`text-lg transition ${
      loopMode === "off"
        ? "text-neutral-400"
        : "text-green-500"
    }`}
  >
    {loopMode === "one" ? "🔂" : "🔁"}
  </span>

  {/* Small dot indicator for loop one */}
  {loopMode === "one" && (
    <span className="absolute -bottom-1 w-1.5 h-1.5 bg-green-500 rounded-full"></span>
  )}
</button>

            <button onClick={prevTrack} className="text-neutral-400 hover:text-white">⏮</button>

            <button
              onClick={togglePlay}
              className="text-white bg-white/10 rounded-full p-1 hover:scale-105 transition"
            >
              {isPlaying ? "⏸" : "▶"}
            </button>

            <button onClick={nextTrack} className="text-neutral-400 hover:text-white">⏭</button>
          </div>

          <div className="flex items-center gap-2 w-full text-xs text-neutral-400 font-medium">
            <span>{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              onChange={(e) => seek(Number(e.target.value))}
              className="flex-1 accent-green-500 h-1 bg-neutral-600 rounded-lg appearance-none cursor-pointer"
            />
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="w-1/3 flex justify-end"></div>
      </div>
    </>
  );
}