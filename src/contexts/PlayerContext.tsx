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

type NetworkQuality = "fast" | "slow" | "offline";

type PlayerContextType = {
  currentTrack: Track | null;
  isPlaying: boolean;
  isBuffering: boolean;
  playbackError: string | null;
  networkQuality: NetworkQuality;
  queue: Track[];
  currentIndex: number;
  playTrack: (track: Track, newQueue?: Track[]) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  isLooping: boolean;
  toggleLoop: () => void;
  isShuffling: boolean;
  toggleShuffle: () => void;
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
  retryPlayback: () => void;
  // Caching
  mySongsCache: any[] | null;
  likedSongsCache: any[] | null;
  refreshMySongsCache: () => Promise<any[]>;
  refreshLikedSongsCache: () => Promise<any[]>;
  showDesktopLyrics: boolean;
  setShowDesktopLyrics: (show: boolean) => void;
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
  const [isShuffling, setIsShuffling] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>("fast");
  const [showDesktopLyrics, setShowDesktopLyrics] = useState(false);

  const [volume, setVolumeState] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Caching state
  const [mySongsCache, setMySongsCache] = useState<any[] | null>(null);
  const [likedSongsCache, setLikedSongsCache] = useState<any[] | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextTrackRef = useRef<() => void>(() => {});
  const isLoopingRef = useRef(false);
  const originalQueueRef = useRef<Track[]>([]);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 2000;

  // --- Queue Prefetching ---
  const prefetchCacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // --- Network Quality Detection ---
  useEffect(() => {
    const nav = navigator as any;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;

    const detect = () => {
      if (!navigator.onLine) {
        setNetworkQuality("offline");
        return;
      }
      if (conn) {
        // effectiveType: 'slow-2g', '2g', '3g', '4g'
        const etype = conn.effectiveType;
        if (etype === "slow-2g" || etype === "2g" || etype === "3g") {
          setNetworkQuality("slow");
        } else {
          setNetworkQuality("fast");
        }
      } else {
        setNetworkQuality("fast"); // can't detect → assume fast
      }
    };

    detect();
    conn?.addEventListener?.("change", detect);
    window.addEventListener("online", detect);
    window.addEventListener("offline", detect);

    return () => {
      conn?.removeEventListener?.("change", detect);
      window.removeEventListener("online", detect);
      window.removeEventListener("offline", detect);
    };
  }, []);

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
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;
    
    const handleEnded = () => {
        flushListenTimeRef.current();
        if (isLoopingRef.current && audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
          listenStartRef.current = Date.now();
        } else {
          nextTrackRef.current();
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) setDuration(audioRef.current.duration);
    };

    // --- Buffering / network event handlers ---
    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => {
      setIsBuffering(false);
      setPlaybackError(null);
      retryCountRef.current = 0;
    };
    const handlePlaying = () => {
      setIsBuffering(false);
      setPlaybackError(null);
      retryCountRef.current = 0;
    };
    const handleStalled = () => setIsBuffering(true);

    const handleError = () => {
      if (!audioRef.current?.src || audioRef.current.src === window.location.href) return;
      setIsBuffering(false);

      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current += 1;
        setIsBuffering(true);
        retryTimerRef.current = setTimeout(() => {
          if (audioRef.current?.src) {
            const src = audioRef.current.src;
            audioRef.current.src = src;
            audioRef.current.load();
            audioRef.current.play().catch(() => {});
          }
        }, RETRY_DELAY_MS);
      } else {
        setPlaybackError("Unable to play — check your connection and try again.");
        setIsPlaying(false);
      }
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('stalled', handleStalled);
    audio.addEventListener('error', handleError);
    
    return () => {
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('waiting', handleWaiting);
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('playing', handlePlaying);
        audio.removeEventListener('stalled', handleStalled);
        audio.removeEventListener('error', handleError);
        audio.pause();
        audioRef.current = null;
    };
  }, []);

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

    // Clear pending retries from previous track
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    retryCountRef.current = 0;
    setPlaybackError(null);

    if (currentTrack) {
        setIsBuffering(true);
        audioRef.current.src = currentTrack.url;
        audioRef.current.load();
        audioRef.current.play()
            .then(() => setIsPlaying(true))
            .catch(() => {});
        listenStartRef.current = Date.now();
    } else {
        setIsBuffering(false);
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

  // --- Prefetch nearby queue items (adaptive to network) ---
  useEffect(() => {
    if (queue.length === 0 || currentIndex < 0) return;

    // Adapt prefetch range based on network quality
    const PREFETCH_RANGE = networkQuality === "fast" ? 2
                          : networkQuality === "slow" ? 1
                          : 0; // offline — don't prefetch

    const desiredIds = new Set<string>();
    for (let offset = -PREFETCH_RANGE; offset <= PREFETCH_RANGE; offset++) {
      if (offset === 0) continue;
      const idx = currentIndex + offset;
      if (idx >= 0 && idx < queue.length) {
        desiredIds.add(queue[idx].id);
      }
    }

    const cache = prefetchCacheRef.current;

    // Remove entries outside the current window
    for (const [id, audio] of cache) {
      if (!desiredIds.has(id)) {
        audio.src = "";
        cache.delete(id);
      }
    }

    // Create new prefetch entries
    for (let offset = -PREFETCH_RANGE; offset <= PREFETCH_RANGE; offset++) {
      if (offset === 0) continue;
      const idx = currentIndex + offset;
      if (idx >= 0 && idx < queue.length) {
        const track = queue[idx];
        if (!cache.has(track.id)) {
          // Do not prefetch proxy/streaming URLs to avoid multiple expensive API calls
          if (track.url.includes("/api/download") || track.url.includes("/api/stream")) {
            continue;
          }
          const audio = new Audio();
          audio.preload = networkQuality === "slow" ? "metadata" : "auto";
          audio.src = track.url;
          cache.set(track.id, audio);
        }
      }
    }
  }, [currentIndex, queue, networkQuality]);

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

  const toggleShuffle = () => {
    setIsShuffling(prev => {
      if (!prev) {
        // Turning shuffle ON — save original queue, shuffle the rest
        setQueue(q => {
          originalQueueRef.current = q;
          const current = q[currentIndex];
          const rest = q.filter((_, i) => i !== currentIndex);
          // Fisher-Yates shuffle
          for (let i = rest.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [rest[i], rest[j]] = [rest[j], rest[i]];
          }
          const shuffled = [current, ...rest];
          setCurrentIndex(0);
          return shuffled;
        });
      } else {
        // Turning shuffle OFF — restore original order
        setQueue(() => {
          const original = originalQueueRef.current;
          if (original.length > 0) {
            const idx = original.findIndex(t => t.id === currentTrack?.id);
            setCurrentIndex(idx !== -1 ? idx : 0);
            return original;
          }
          return queue;
        });
      }
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

  const retryPlayback = useCallback(() => {
    if (!audioRef.current || !currentTrack) return;
    retryCountRef.current = 0;
    setPlaybackError(null);
    setIsBuffering(true);
    audioRef.current.src = currentTrack.url;
    audioRef.current.load();
    audioRef.current.play()
      .then(() => setIsPlaying(true))
      .catch(() => {});
  }, [currentTrack]);

  // Convenience wrappers that also invalidate caches
  const refreshLibrary = () => {
    refreshMySongsCache();
  };

  const refreshLikedSongs = () => {
    refreshLikedSongsCache();
  };

  const toggleLikeSong = async (songData: any): Promise<boolean> => {
    const isLiked = likedSongs.has(songData.spotify_id);
    const newLiked = !isLiked;

    // --- Optimistic update: flip UI immediately ---
    if (newLiked) {
      setLikedSongs(prev => new Set(prev).add(songData.spotify_id));
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
    } else {
      setLikedSongs(prev => {
        const next = new Set(prev);
        next.delete(songData.spotify_id);
        return next;
      });
      setLikedSongsCache(prev => prev ? prev.filter(s => s.spotify_id !== songData.spotify_id) : null);
    }

    // --- Fire API in background, rollback on failure ---
    try {
      const res = await fetch("/api/user-liked-songs", {
        method: newLiked ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLiked ? songData : { spotify_id: songData.spotify_id }),
      });
      if (!res.ok) throw new Error();
      return newLiked;
    } catch {
      // Rollback to previous state
      if (newLiked) {
        setLikedSongs(prev => {
          const next = new Set(prev);
          next.delete(songData.spotify_id);
          return next;
        });
        setLikedSongsCache(prev => prev ? prev.filter(s => s.spotify_id !== songData.spotify_id) : null);
      } else {
        setLikedSongs(prev => new Set(prev).add(songData.spotify_id));
      }
      return isLiked;
    }
  };

  return (
    <PlayerContext.Provider value={{ currentTrack, isPlaying, isBuffering, playbackError, networkQuality, queue, currentIndex, playTrack, togglePlay, nextTrack, prevTrack, isLooping, toggleLoop, isShuffling, toggleShuffle, downloadedSongs, refreshLibrary, likedSongs, refreshLikedSongs, toggleLikeSong, currentTime, duration, seek, volume, setVolume, retryPlayback, mySongsCache, likedSongsCache, refreshMySongsCache, refreshLikedSongsCache, showDesktopLyrics, setShowDesktopLyrics }}>
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