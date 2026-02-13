"use client";

import { useState, useRef, useEffect } from "react";

export default function Player() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);


  useEffect(() => {
    const handlePlayTrack = (event: CustomEvent) => {
      const track = event.detail;
      setCurrentTrack(track);
      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.src = track.url;
        audioRef.current.play();
      }
    };

    window.addEventListener("play_track" as any, handlePlayTrack);
    return () => {
      window.removeEventListener("play_track" as any, handlePlayTrack);
    };
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-neutral-800 p-4 h-24 flex items-center justify-between z-50">
      <div className="flex items-center gap-4 w-1/3">
        <img
          src={currentTrack.cover}
          alt={currentTrack.title}
          className="w-14 h-14 rounded-md shadow-lg"
        />
        <div>
          <h4 className="text-white font-bold text-sm">{currentTrack.title}</h4>
          <p className="text-neutral-400 text-xs">{currentTrack.artist}</p>
        </div>
      </div>

      <div className="flex flex-col items-center w-1/3">
        <div className="flex items-center gap-6 mb-2">
          <button className="text-neutral-400 hover:text-white">⏮</button>
          <button
            onClick={togglePlay}
            className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 transition"
          >
            {isPlaying ? "⏸" : "▶"}
          </button>
          <button className="text-neutral-400 hover:text-white">⏭</button>
        </div>
        <div className="w-full max-w-md bg-neutral-600 h-1 rounded-full overflow-hidden">
          <div className="bg-white h-full w-0"></div> {/* Progress bar placeholder */}
        </div>
      </div>

      <div className="w-1/3 flex justify-end">
        {/* Volume controls placeholder */}
      </div>

      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        onError={(e) => {
          console.error("Audio playback error event:", e);
          const audio = e.currentTarget;
          if (audio.error) {
            console.error("Audio Error Code:", audio.error.code);
            console.error("Audio Error Message:", audio.error.message);
          }
        }}
      />
    </div>
  );
}
