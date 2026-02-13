"use client";

import { useState, useRef, useEffect } from "react";

interface Track {
  title: string;
  artist: string;
  cover: string;
  url: string;
}

export default function Player() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);

  // ✅ NEW: queue support
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  // ✅ NEW: time tracking
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const handlePlayTrack = async (event: any) => {
      const track: Track = event.detail.track;
      const newQueue: Track[] = event.detail.queue || [track];

      const index = newQueue.findIndex(t => t.url === track.url);

      setQueue(newQueue);
      setCurrentIndex(index !== -1 ? index : 0);
      setCurrentTrack(track);

      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current.src = track.url;

          await audioRef.current.play();
          setIsPlaying(true);
        } catch (error) {
          console.error("Playback failed:", error);
          setIsPlaying(false);
        }
      }
    };

    window.addEventListener("play_track", handlePlayTrack as EventListener);

    return () => {
      window.removeEventListener("play_track", handlePlayTrack as EventListener);
    };
  }, []);

  // ✅ Time tracking
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const setMeta = () => setDuration(audio.duration);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", setMeta);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", setMeta);
    };
  }, []);

  const togglePlay = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Toggle play error:", error);
    }
  };

  // ✅ Next
  const nextTrack = () => {
    if (currentIndex + 1 < queue.length) {
      const next = queue[currentIndex + 1];
      setCurrentIndex(currentIndex + 1);
      setCurrentTrack(next);
      audioRef.current!.src = next.url;
      audioRef.current!.play();
      setIsPlaying(true);
    }
  };

  // ✅ Previous
  const prevTrack = () => {
    if (!audioRef.current) return;

    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    if (currentIndex - 1 >= 0) {
      const prev = queue[currentIndex - 1];
      setCurrentIndex(currentIndex - 1);
      setCurrentTrack(prev);
      audioRef.current.src = prev.url;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // ✅ Seek
  const seek = (value: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value;
    setCurrentTime(value);
  };

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-neutral-800 p-4 h-28 flex items-center justify-between z-50">

      {/* Track Info */}
      <div className="flex items-center gap-4 w-1/3">
        <img
          src={currentTrack.cover}
          alt={currentTrack.title}
          className="w-14 h-14 rounded-md shadow-lg"
        />
        <div>
          <h4 className="text-white font-bold text-sm">
            {currentTrack.title}
          </h4>
          <p className="text-neutral-400 text-xs">
            {currentTrack.artist}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center w-1/3">

        <div className="flex items-center gap-6 mb-2">
          <button onClick={prevTrack} className="text-neutral-400 hover:text-white">
            ⏮
          </button>

          <button
            onClick={togglePlay}
            className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 transition"
          >
            {isPlaying ? "⏸" : "▶"}
          </button>

          <button onClick={nextTrack} className="text-neutral-400 hover:text-white">
            ⏭
          </button>
        </div>

        {/* ✅ Progress Bar */}
        <div className="w-full max-w-md flex items-center gap-2">
          <span className="text-xs text-neutral-400">
            {Math.floor(currentTime / 60)}:
            {String(Math.floor(currentTime % 60)).padStart(2, "0")}
          </span>

          <input
            type="range"
            min={0}
            max={duration || 0}
            value={currentTime}
            onChange={(e) => seek(Number(e.target.value))}
            className="flex-1"
          />

          <span className="text-xs text-neutral-400">
            {Math.floor(duration / 60)}:
            {String(Math.floor(duration % 60)).padStart(2, "0")}
          </span>
        </div>
      </div>

      <div className="w-1/3 flex justify-end" />

      <audio
        ref={audioRef}
        preload="auto"
        crossOrigin="anonymous"
        onEnded={nextTrack}
        onError={(e) => {
          console.error("Audio error:", e);
        }}
      />
    </div>
  );
}