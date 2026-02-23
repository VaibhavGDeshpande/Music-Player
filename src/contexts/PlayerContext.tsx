"use client";

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";

type Track = {
  id: string;
  title: string;
  artist: string;
  cover?: string;
  url: string; 
  duration?: number;
  album?: string;
};

type PlayerContextType = {
  currentTrack: Track | null;
  isPlaying: boolean;
  queue: Track[];
  playTrack: (track: Track, newQueue?: Track[]) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  isLooping: boolean;
  toggleLoop: () => void;
  downloadedSongs: Set<string>;
  refreshLibrary: () => void;
  likedSongs: Set<string>;
  refreshLikedSongs: () => void;
  toggleLikeSong: (songData: any) => Promise<boolean>;
  currentTime: number;
  duration: number;
  seek: (time: number) => void;
  volume: number;
  setVolume: (v: number) => void;
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
  const [isLooping, setIsLooping] = useState(false);

  const [volume, setVolumeState] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Caching state
  const [mySongsCache, setMySongsCache] = useState<any[] | null>(null);
  const [likedSongsCache, setLikedSongsCache] = useState<any[] | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextTrackRef = useRef<() => void>(() => {});
  const isLoopingRef = useRef(false);

  // --- Time Tracking ---
  const listenStartRef = useRef<number | null>(null);   // wall-clock ms when playback resumed
  const accumulatedRef = useRef<number>(0);             // ms listened so far for currentTrack
  const trackedTrackRef = useRef<string | null>(null);  // which track we're accumulating for
  const flushListenTimeRef = useRef<(track?: Track | null) => void>(() => {});

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
    } catch {
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
    } catch {
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
        // Flush time — track finished naturally
        // currentTrack is likely stale or we want to ensure we log usage
        flushListenTimeRef.current();

        if (isLoopingRef.current && audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
          listenStartRef.current = Date.now(); // restart clock for loop
        } else {
          nextTrackRef.current();
        }
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

  /**
   * Sends accumulated listen time for the track that just ended/changed.
   * Called whenever we switch tracks, pause-then-skip, or the audio ends.
   */
  const flushListenTime = useCallback((track: Track | null) => {
    if (!track) return;

    // If currently playing, add the time since last resume
    if (listenStartRef.current !== null) {
      accumulatedRef.current += Date.now() - listenStartRef.current;
      listenStartRef.current = null;
    }

    const listenedMs = accumulatedRef.current;
    accumulatedRef.current = 0;
    trackedTrackRef.current = null;

    if (listenedMs < 1000) return; // ignore < 1 second (accidental clicks)

    fetch("/api/player/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trackId: track.id,
        trackName: track.title,
        artistName: track.artist,
        albumName: track.album,
        imageUrl: track.cover,
        durationMs: track.duration || (audioRef.current ? Math.round(audioRef.current.duration * 1000) : null),
        listenedMs,
      }),
    }).catch(() => {});
  }, []);

  // Update ref
  useEffect(() => {
    flushListenTimeRef.current = (t) => flushListenTime(t || currentTrack);
  }, [flushListenTime, currentTrack]);

   // Effect to handle actual playback when currentTrack changes
  useEffect(() => {
    if (!audioRef.current) return;

    // Reset accumulator for the new track
    accumulatedRef.current = 0;
    listenStartRef.current = null;
    trackedTrackRef.current = currentTrack?.id ?? null;

    if (currentTrack) {
        audioRef.current.src = currentTrack.url;
        audioRef.current.play()
            .then(() => {
                setIsPlaying(true);
            })
            .catch(() => {});
        // Start the clock synchronously so it's always set,
        // even if the play() promise hasn't resolved yet
        listenStartRef.current = Date.now();
    }
  }, [currentTrack]);

  // Sync volume to audio element
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Effect to handle Play/Pause toggle without changing track
  useEffect(() => {
      if (!audioRef.current) return;
      
      if (isPlaying) {
          audioRef.current.play().catch(() => {});
          listenStartRef.current = Date.now();
      } else {
          audioRef.current.pause();
          if (listenStartRef.current !== null) {
              accumulatedRef.current += Date.now() - listenStartRef.current;
              listenStartRef.current = null;
          }
      }
  }, [isPlaying]);

  const playTrack = (track: Track, newQueue?: Track[]) => {
    // Flush previous
    if (currentTrack) flushListenTime(currentTrack);

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

  const toggleLoop = () => {
    setIsLooping(prev => {
      isLoopingRef.current = !prev;
      return !prev;
    });
  };

  const togglePlay = () => {
    setIsPlaying(prev => !prev);
  };

  const nextTrack = useCallback(() => {
    setQueue(q => {
      setCurrentIndex(idx => {
        const nextIdx = idx + 1;
        if (nextIdx < q.length) {
          flushListenTime(q[idx]); // ← flush current before switching
          setCurrentTrack(q[nextIdx]);
          return nextIdx;
        } else {
          flushListenTime(q[idx]); // flush last track
          setIsPlaying(false);
          return idx;
        }
      });
      return q;
    });
  }, [flushListenTime]);

  // Keep ref in sync
  useEffect(() => {
    nextTrackRef.current = nextTrack;
  }, [nextTrack]);

  const prevTrack = () => {
    if (queue.length === 0) return;
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      flushListenTime(queue[currentIndex]); // ← flush before going back
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

  const setVolume = (v: number) => {
      setVolumeState(Math.max(0, Math.min(1, v)));
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
    } catch {
      return isLiked;
    }
  };

  return (
    <PlayerContext.Provider value={{ currentTrack, isPlaying, queue, playTrack, togglePlay, nextTrack, prevTrack, isLooping, toggleLoop, downloadedSongs, refreshLibrary, likedSongs, refreshLikedSongs, toggleLikeSong, currentTime, duration, seek, volume, setVolume, mySongsCache, likedSongsCache, refreshMySongsCache, refreshLikedSongsCache }}>
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