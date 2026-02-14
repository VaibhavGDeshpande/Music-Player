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
    seek 
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
      {/* MOBILE MINI PLAYER */}
      <div className="md:hidden fixed bottom-[60px] left-0 right-0 mx-2 p-2 bg-neutral-900/95 backdrop-blur-md rounded-lg border border-neutral-800 flex items-center justify-between z-50 shadow-xl transition-all">
         <div 
           className="absolute bottom-0 left-2 right-2 h-[2px] bg-neutral-700 rounded-full overflow-hidden"
           onClick={(e) => {
               const rect = e.currentTarget.getBoundingClientRect();
               const x = e.clientX - rect.left;
               const width = rect.width;
               const percentage = x / width;
               seek(percentage * duration);
           }}
         >
            <div 
              className="h-full bg-white/80" 
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
         </div>

         <div className="flex items-center gap-3 flex-1 overflow-hidden mr-4">
           <img src={currentTrack.cover} className="w-10 h-10 rounded-md object-cover flex-shrink-0" />
           <div className="overflow-hidden">
             <p className="text-sm text-white font-medium truncate">
               {currentTrack.title}
             </p>
             <p className="text-xs text-neutral-400 truncate">
               {currentTrack.artist} • {formatTime(currentTime)} / {formatTime(duration)}
             </p>
           </div>
         </div>

         <div className="flex items-center gap-3 pr-2">
            <button onClick={togglePlay} className="text-white text-2xl focus:outline-none">
              {isPlaying ? "⏸" : "▶"}
            </button>
         </div>
      </div>

      {/* DESKTOP PLAYER */}
      <div className="hidden md:flex fixed bottom-0 left-0 md:left-64 right-0 bg-black border-t border-neutral-800 p-4 z-40 items-center justify-between">
        <div className="flex items-center gap-4 w-1/3">
          <img src={currentTrack.cover} className="w-14 h-14 rounded-md" />
          <div>
            <h4 className="text-white text-sm font-bold">
              {currentTrack.title}
            </h4>
            <p className="text-neutral-400 text-xs">
              {currentTrack.artist}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center max-w-[45%] w-full">
          <div className="flex gap-6 mb-2">
            <button onClick={prevTrack} className="hover:text-white text-neutral-400">⏮</button>
            <button onClick={togglePlay} className="text-white bg-white/10 rounded-full p-1 hover:scale-105 transition">
              {isPlaying ? "⏸" : "▶"}
            </button>
            <button onClick={nextTrack} className="hover:text-white text-neutral-400">⏭</button>
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

        <div className="w-1/3 flex justify-end">
            {/* Volume or other controls could go here */}
        </div>
      </div>
    </>
  );
}