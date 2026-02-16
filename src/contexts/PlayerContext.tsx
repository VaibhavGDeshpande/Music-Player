"use client";

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";

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
  // Caching
  mySongsCache: any[] | null;
  likedSongsCache: any[] | null;
  refreshMySongsCache: () => Promise<any[]>;
  refreshLikedSongsCache: () => Promise<any[]>;
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

  // Caching state
  const [mySongsCache, setMySongsCache] = useState<any[] | null>(null);
  const [likedSongsCache, setLikedSongsCache] = useState<any[] | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextTrackRef = useRef<() => void>(() => {});

  // Fetch and cache my-songs
  const refreshMySongsCache = useCallback(async (): Promise<any[]> => {
    try {
      const res = await fetch("/api/my-songs");
      const data = await res.json();
      const songs = data.songs || [];
      setMySongsCache(songs);
      // Also update the downloaded IDs set
      const ids = new Set<string>(songs.map((s: any) => s.spotify_id));
      setDownloadedSongs(ids);
      return songs;
    } catch (err) {
      console.error("Failed to fetch my-songs", err);
      return [];
    }
  }, []);

  // Fetch and cache liked-songs (local DB)
  const refreshLikedSongsCache = useCallback(async (): Promise<any[]> => {
    try {
      const res = await fetch("/api/user-liked-songs");
      const data = await res.json();
      const songs = data.songs || [];
      setLikedSongsCache(songs);
      // Also update the liked IDs set
      const ids = new Set<string>(songs.map((s: any) => s.spotify_id));
      setLikedSongs(ids);
      return songs;
    } catch (err) {
      console.error("Failed to fetch liked-songs", err);
      return [];
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    refreshMySongsCache();
    refreshLikedSongsCache();
  }, [refreshMySongsCache, refreshLikedSongsCache]);

  // Initialize Audio Element once
  useEffect(() => {
    audioRef.current = new Audio();
    
    const handleEnded = () => {
        nextTrackRef.current();
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
        // If no queue provided, just play this one
        setQueue([track]);
        setCurrentIndex(0);
    }
    setCurrentTrack(track);
    setIsPlaying(true);
  };

  const togglePlay = () => {
    setIsPlaying(prev => !prev);
  };

  const nextTrack = useCallback(() => {
    setQueue(q => {
      setCurrentIndex(idx => {
        const nextIdx = idx + 1;
        if (nextIdx < q.length) {
          setCurrentTrack(q[nextIdx]);
          return nextIdx;
        } else {
          setIsPlaying(false);
          return idx;
        }
      });
      return q;
    });
  }, []);

  // Keep ref in sync
  useEffect(() => {
    nextTrackRef.current = nextTrack;
  }, [nextTrack]);

  const prevTrack = () => {
    if (queue.length === 0) return;
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      setCurrentIndex(prevIndex);
      setCurrentTrack(queue[prevIndex]);
    } else {
        // Restart current song if at start
        if (audioRef.current) audioRef.current.currentTime = 0;
    }
  };

  const seek = (time: number) => {
      if (audioRef.current) {
          audioRef.current.currentTime = time;
          setCurrentTime(time);
      }
  };

  // Convenience wrappers that also invalidate caches
  const refreshLibrary = () => {
    refreshMySongsCache();
  };

  const refreshLikedSongs = () => {
    refreshLikedSongsCache();
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
        // Invalidate liked songs cache
        setLikedSongsCache(prev => prev ? prev.filter(s => s.spotify_id !== songData.spotify_id) : null);
        return false;
      } else {
        await fetch("/api/user-liked-songs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(songData),
        });
        setLikedSongs(prev => new Set(prev).add(songData.spotify_id));
        // Invalidate liked songs cache — add the new song at the top
        setLikedSongsCache(prev => {
          const newSong = {
            spotify_id: songData.spotify_id,
            title: songData.title,
            artist: songData.artist,
            album: songData.album,
            cover_url: songData.cover_url,
            duration_ms: songData.duration_ms,
          };
          return prev ? [newSong, ...prev] : [newSong];
        });
        return true;
      }
    } catch (err) {
      console.error("Error toggling like:", err);
      return isLiked;
    }
  };

  return (
    <PlayerContext.Provider value={{ currentTrack, isPlaying, queue, playTrack, togglePlay, nextTrack, prevTrack, downloadedSongs, refreshLibrary, likedSongs, refreshLikedSongs, toggleLikeSong, currentTime, duration, seek, mySongsCache, likedSongsCache, refreshMySongsCache, refreshLikedSongsCache }}>
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