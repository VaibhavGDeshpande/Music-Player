"use client";

import React, { createContext, useContext, useState, useRef, useEffect } from "react";

type Track = {
  id: string;
  title: string;
  artist: string;
  cover?: string;
  url: string; // The Supabase Storage URL
  duration?: number;
};

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
  likedSongs: Set<string>;
  refreshLikedSongs: () => void;
  toggleLikeSong: (songData: any) => Promise<boolean>;
  currentTime: number;
  duration: number;
  seek: (time: number) => void;
};

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [downloadedSongs, setDownloadedSongs] = useState<Set<string>>(new Set());
  const [likedSongs, setLikedSongs] = useState<Set<string>>(new Set());

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initial fetch of user's downloaded songs to populate cache
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

    // Fetch liked songs
    fetch("/api/user-liked-songs")
      .then(res => res.json())
      .then(data => {
        if (data.songs) {
          const ids = new Set<string>(data.songs.map((s: any) => s.spotify_id));
          setLikedSongs(ids);
        }
      })
      .catch(err => console.error("Failed to cache liked songs", err));
  }, []);

  // Initialize Audio Element once
  useEffect(() => {
    audioRef.current = new Audio();
    
    const handleEnded = () => {
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

    audioRef.current.addEventListener('ended', handleEnded);
    audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
    audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    return () => {
        audioRef.current?.removeEventListener('ended', handleEnded);
        audioRef.current?.removeEventListener('timeupdate', handleTimeUpdate);
        audioRef.current?.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audioRef.current?.pause();
        audioRef.current = null;
    };
  }, []); // Empty dependency array ensures this runs once on mount.

  // Effect to handle actual playback when currentTrack changes
  useEffect(() => {
    if (currentTrack && audioRef.current) {
        audioRef.current.src = currentTrack.url;
        audioRef.current.play()
            .then(() => setIsPlaying(true))
            .catch(err => console.error("Playback failed:", err));
    }
  }, [currentTrack]);

  // Effect to handle Play/Pause toggle without changing track
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
        // If no queue provided, just play this one (or append? lets keep it simple: clear queue)
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
      setIsPlaying(false); // End of queue
    }
  };

  const prevTrack = () => {
    if (queue.length === 0) return;
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      setCurrentIndex(prevIndex);
      setCurrentTrack(queue[prevIndex]);
    } else {
        // Restart current song if at start?
        if (audioRef.current) audioRef.current.currentTime = 0;
    }
  };

  const seek = (time: number) => {
      if (audioRef.current) {
          audioRef.current.currentTime = time;
          setCurrentTime(time);
      }
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

  const refreshLikedSongs = () => {
    fetch("/api/user-liked-songs")
      .then(res => res.json())
      .then(data => {
        if (data.songs) {
          const ids = new Set<string>(data.songs.map((s: any) => s.spotify_id));
          setLikedSongs(ids);
        }
      });
  };

  const toggleLikeSong = async (songData: any): Promise<boolean> => {
    const isLiked = likedSongs.has(songData.spotify_id);
    try {
      if (isLiked) {
        await fetch("/api/user-liked-songs", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spotify_id: songData.spotify_id }),
        });
        setLikedSongs(prev => {
          const next = new Set(prev);
          next.delete(songData.spotify_id);
          return next;
        });
        return false;
      } else {
        await fetch("/api/user-liked-songs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(songData),
        });
        setLikedSongs(prev => new Set(prev).add(songData.spotify_id));
        return true;
      }
    } catch (err) {
      console.error("Error toggling like:", err);
      return isLiked;
    }
  };

  return (
    <PlayerContext.Provider value={{ currentTrack, isPlaying, queue, playTrack, togglePlay, nextTrack, prevTrack, downloadedSongs, refreshLibrary, likedSongs, refreshLikedSongs, toggleLikeSong, currentTime, duration, seek }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
}