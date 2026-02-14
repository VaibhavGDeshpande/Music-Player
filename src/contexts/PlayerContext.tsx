"use client";

import React, { createContext, useContext, useState, useRef, useEffect } from "react";

type Track = {
  id: string;
  title: string;
  artist: string;
  cover?: string;
  url: string;
  duration?: number;
};

type LoopMode = "off" | "all" | "one";

type PlayerContextType = {
  currentTrack: Track | null;
  isPlaying: boolean;
  queue: Track[];
  playTrack: (track: Track, newQueue?: Track[]) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  downloadedSongs: Set<string>;
  refreshLibrary: () => void;
  currentTime: number;
  duration: number;
  seek: (time: number) => void;
  loopMode: LoopMode;
  toggleLoop: () => void;
};

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [downloadedSongs, setDownloadedSongs] = useState<Set<string>>(new Set());

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [loopMode, setLoopMode] = useState<LoopMode>("off");

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load downloaded songs
  useEffect(() => {
    fetch("/api/my-songs")
      .then(res => res.json())
      .then(data => {
        if (data.songs) {
          const ids = new Set<string>(data.songs.map((s: any) => s.spotify_id));
          setDownloadedSongs(ids);
        }
      })
      .catch(err => console.error("Failed to cache library", err));
  }, []);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio();

    const handleEnded = () => {
      if (loopMode === "one") {
        audioRef.current!.currentTime = 0;
        audioRef.current!.play();
        return;
      }
      nextTrack();
    };

    const handleTimeUpdate = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      if (audioRef.current) {
        setDuration(audioRef.current.duration);
      }
    };

    audioRef.current.addEventListener("ended", handleEnded);
    audioRef.current.addEventListener("timeupdate", handleTimeUpdate);
    audioRef.current.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      audioRef.current?.removeEventListener("ended", handleEnded);
      audioRef.current?.removeEventListener("timeupdate", handleTimeUpdate);
      audioRef.current?.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (currentTrack && audioRef.current) {
      audioRef.current.src = currentTrack.url;
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error("Playback failed:", err));
    }
  }, [currentTrack]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.play().catch(e => console.error(e));
      else audioRef.current.pause();
    }
  }, [isPlaying]);

  const playTrack = (track: Track, newQueue?: Track[]) => {
    if (newQueue) {
      setQueue(newQueue);
      const index = newQueue.findIndex(t => t.id === track.id);
      setCurrentIndex(index !== -1 ? index : 0);
    } else {
      setQueue([track]);
      setCurrentIndex(0);
    }
    setCurrentTrack(track);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    setIsPlaying(prev => !prev);
  };

  const nextTrack = () => {
    if (queue.length === 0) return;

    const nextIndex = currentIndex + 1;

    if (nextIndex < queue.length) {
      setCurrentIndex(nextIndex);
      setCurrentTrack(queue[nextIndex]);
    } else {
      if (loopMode === "all") {
        setCurrentIndex(0);
        setCurrentTrack(queue[0]);
      } else {
        setIsPlaying(false);
      }
    }
  };

  const prevTrack = () => {
    if (queue.length === 0) return;

    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    const prevIndex = currentIndex - 1;

    if (prevIndex >= 0) {
      setCurrentIndex(prevIndex);
      setCurrentTrack(queue[prevIndex]);
    }
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleLoop = () => {
    setLoopMode(prev => {
      if (prev === "off") return "all";
      if (prev === "all") return "one";
      return "off";
    });
  };

  const refreshLibrary = () => {
    fetch("/api/my-songs")
      .then(res => res.json())
      .then(data => {
        if (data.songs) {
          const ids = new Set<string>(data.songs.map((s: any) => s.spotify_id));
          setDownloadedSongs(ids);
        }
      });
  };

  return (
    <PlayerContext.Provider value={{
      currentTrack,
      isPlaying,
      queue,
      playTrack,
      togglePlay,
      nextTrack,
      prevTrack,
      downloadedSongs,
      refreshLibrary,
      currentTime,
      duration,
      seek,
      loopMode,
      toggleLoop
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
}