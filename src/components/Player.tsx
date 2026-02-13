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
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const handlePlayTrack = async (event: any) => {
      const track: Track = event.detail.track || event.detail;
      const newQueue: Track[] = event.detail.queue || [track];

      if (!track) return;

      const index = newQueue.findIndex((t) => t.url === track.url);

      setQueue(newQueue);
      setCurrentIndex(index !== -1 ? index : 0);
      setCurrentTrack(track);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = track.url;
        await audioRef.current.play();
        setIsPlaying(true);
      }
    };

    window.addEventListener("play_track", handlePlayTrack as EventListener);
    return () =>
      window.removeEventListener("play_track", handlePlayTrack as EventListener);
  }, []);

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
    isPlaying ? audioRef.current.pause() : await audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

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

  const seek = (value: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value;
    setCurrentTime(value);
  };

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-[56px] md:bottom-0 left-0 md:left-64 right-0 bg-black border-t border-neutral-800 p-3 md:p-4 z-40">

      {/* MOBILE LAYOUT */}
      <div className="flex flex-col md:hidden gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={currentTrack.cover} className="w-10 h-10 rounded" />
            <div>
              <p className="text-sm text-white truncate">
                {currentTrack.title}
              </p>
              <p className="text-xs text-neutral-400 truncate">
                {currentTrack.artist}
              </p>
            </div>
          </div>
          <button onClick={togglePlay} className="text-white text-lg">
            {isPlaying ? "⏸" : "▶"}
          </button>
        </div>

        <input
          type="range"
          min={0}
          max={duration || 0}
          value={currentTime}
          onChange={(e) => seek(Number(e.target.value))}
        />
      </div>

      {/* DESKTOP LAYOUT */}
      <div className="hidden md:flex items-center justify-between">
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

        <div className="flex flex-col items-center w-1/3">
          <div className="flex gap-6 mb-2">
            <button onClick={prevTrack}>⏮</button>
            <button onClick={togglePlay}>
              {isPlaying ? "⏸" : "▶"}
            </button>
            <button onClick={nextTrack}>⏭</button>
          </div>

          <input
            type="range"
            min={0}
            max={duration || 0}
            value={currentTime}
            onChange={(e) => seek(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="w-1/3" />
      </div>

      <audio ref={audioRef} onEnded={nextTrack} />
    </div>
  );
}