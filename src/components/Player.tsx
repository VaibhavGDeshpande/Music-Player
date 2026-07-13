"use client";

import { usePlayer } from "@/contexts/PlayerContext";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

type LyricLine = {
  startTimeMs: string;
  words: string;
};

export default function Player() {
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    playbackError,
    networkQuality,
    togglePlay,
    nextTrack,
    prevTrack,
    isLooping,
    toggleLoop,
    isShuffling,
    toggleShuffle,
    currentTime,
    duration,
    seek,
    volume,
    setVolume,
    likedSongs,
    toggleLikeSong,
    retryPlayback,
    queue,
    currentIndex,
    playTrack,
    removeFromQueue,
    clearQueue,
    randomizeQueue,
    showDesktopLyrics,
    setShowDesktopLyrics,
  } = usePlayer();

  const [showBigPlayer, setShowBigPlayer] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showMobileQueue, setShowMobileQueue] = useState(false);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsError, setLyricsError] = useState(false);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLParagraphElement>(null);
  const lastTrackIdRef = useRef<string | null>(null);
  const prevVolumeRef = useRef(1);

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isLiked = currentTrack ? likedSongs.has(currentTrack.id) : false;

  const handleLike = async () => {
    if (!currentTrack) return;
    await toggleLikeSong({
      spotify_id: currentTrack.id,
      title: currentTrack.title,
      artist: currentTrack.artist,
      cover_url: currentTrack.cover,
    });
  };

  // Fetch lyrics when track changes
  const fetchLyrics = useCallback(async (trackId: string) => {
    if (lastTrackIdRef.current === trackId && lyrics.length > 0) return;
    lastTrackIdRef.current = trackId;
    setLyricsLoading(true);
    setLyricsError(false);
    setLyrics([]);

    try {
      const res = await fetch(`/api/lyrics?trackid=${trackId}`);
      if (!res.ok) throw new Error("Failed to fetch lyrics");
      const data = await res.json();
      if (data.error || !data.lines || data.lines.length === 0) {
        setLyricsError(true);
      } else {
        // Filter out empty lines at the end
        const filteredLines = data.lines.filter(
          (line: LyricLine) => line.words.trim() !== ""
        );
        setLyrics(filteredLines.length > 0 ? data.lines : []);
        if (filteredLines.length === 0) setLyricsError(true);
      }
    } catch {
      setLyricsError(true);
    } finally {
      setLyricsLoading(false);
    }
  }, [lyrics.length]);

  useEffect(() => {
    if ((showBigPlayer || showDesktopLyrics) && currentTrack) {
      fetchLyrics(currentTrack.id);
    }
  }, [showBigPlayer, showDesktopLyrics, currentTrack?.id, fetchLyrics]);

  useEffect(() => {
    setShowMobileQueue(false);
  }, [currentTrack?.id]);

  // Intercept browser back button to close the mobile big player modal
  useEffect(() => {
    if (!showBigPlayer) return;

    // Push state to history to enable back button interception
    window.history.pushState({ playerOpen: true }, "");

    const handlePopState = (event: PopStateEvent) => {
      setShowBigPlayer(false);
      setShowLyrics(false);
      setShowMobileQueue(false);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (window.history.state?.playerOpen) {
        window.history.back();
      }
    };
  }, [showBigPlayer]);

  // Find active lyric line index
  const activeIndex = useMemo(() => {
    if (lyrics.length === 0) return -1;
    const timeMs = currentTime * 1000;
    let idx = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (timeMs >= parseInt(lyrics[i].startTimeMs)) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [currentTime, lyrics]);

  const queueEntries = useMemo(
    () =>
      queue.map((track, index) => ({
        track,
        index,
        isCurrent: index === currentIndex,
        isPlayed: index < currentIndex,
      })),
    [queue, currentIndex]
  );

  const upcomingCount = Math.max(queue.length - currentIndex - 1, 0);

  // Auto-scroll to active lyric
  useEffect(() => {
    if ((showLyrics || showDesktopLyrics) && activeLineRef.current && lyricsContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeIndex, showLyrics, showDesktopLyrics]);

  if (!currentTrack) {
    // Empty player bar — always visible like Spotify
    return (
      <div className="hidden md:flex fixed bottom-0 left-0 right-0 bg-black border-t border-neutral-800 px-4 py-3 z-40 items-center justify-between h-[72px]">
        {/* Empty left section */}
        <div className="flex items-center gap-4 w-1/3">
          <div className="w-14 h-14 rounded-md bg-neutral-800" />
          <div>
            <div className="w-28 h-3 bg-neutral-800 rounded mb-2" />
            <div className="w-20 h-2.5 bg-neutral-800 rounded" />
          </div>
        </div>
        {/* Empty center controls */}
        <div className="flex flex-col items-center max-w-[45%] w-full">
          <div className="flex items-center gap-5 mb-2">
            <div className="text-neutral-600"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" /></svg></div>
            <div className="text-neutral-600"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg></div>
            <div className="w-9 h-9 bg-neutral-700 rounded-full flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#555"><path d="M8 5v14l11-7z" /></svg>
            </div>
            <div className="text-neutral-600"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg></div>
            <div className="text-neutral-600"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" /></svg></div>
          </div>
          <div className="flex items-center gap-2 w-full text-xs text-neutral-600 font-medium">
            <span>-:--</span>
            <div className="flex-1 h-1 bg-neutral-800 rounded-full" />
            <span>-:--</span>
          </div>
        </div>
        {/* Empty right */}
        <div className="w-1/3 flex justify-end items-center gap-3 pr-2">
          <div className="text-neutral-600"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg></div>
          <div className="text-neutral-600"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" /></svg></div>
          <div className="flex items-center gap-2 ml-1">
            <div className="text-neutral-600"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg></div>
            <div className="w-24 h-1 bg-neutral-800 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ============================================
           MOBILE MINI PLAYER — tapping opens big player
         ============================================ */}
      <div
        className="md:hidden fixed bottom-[60px] left-0 right-0 mx-2 p-2 bg-neutral-900/95 backdrop-blur-md rounded-lg border border-neutral-800 flex items-center justify-between z-50 shadow-xl transition-all cursor-pointer"
        onClick={() => setShowBigPlayer(true)}
      >
        <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-neutral-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/80 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center gap-3 flex-1 overflow-hidden mr-4">
          <img
            src={currentTrack.cover || "/placeholder.svg"}
            className="w-10 h-10 rounded-md object-cover flex-shrink-0"
            alt=""
          />
          <div className="overflow-hidden">
            <p className="text-sm text-white font-medium truncate">
              {currentTrack.title}
            </p>
            <p className="text-xs text-neutral-400 truncate">
              {currentTrack.artist}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pr-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevTrack();
            }}
            className="text-white focus:outline-none active:scale-90 transition"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="text-white text-2xl focus:outline-none active:scale-90 transition"
          >
            {isBuffering ? (
              <div className="w-6 h-6 relative">
                <div className="absolute inset-0 rounded-full border-2 border-neutral-600" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white animate-spin" />
              </div>
            ) : isPlaying ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              nextTrack();
            }}
            className="text-white focus:outline-none active:scale-90 transition"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
        </div>
      </div>

      {showBigPlayer && (
        <div className="md:hidden fixed inset-0 z-[100] flex flex-col bg-gradient-to-b from-neutral-800 via-neutral-900 to-black animate-slideUp">
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 pt-4 pb-2">
            <button
              onClick={() => { setShowBigPlayer(false); setShowLyrics(false); setShowMobileQueue(false); }}
              className="text-white text-2xl p-2 -ml-2 active:scale-90 transition"
              aria-label="Close"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            <div className="text-center flex-1">
              <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">
                Playing from your library
              </p>
              <p className="text-xs text-white font-semibold mt-0.5">
                Now Playing
              </p>
            </div>
            {/* Network Quality Badge */}
            <div className="w-10 flex justify-end">
              {networkQuality === "slow" && (
                <span className="text-[9px] font-bold text-yellow-400 bg-yellow-400/15 px-1.5 py-0.5 rounded-full">SLOW</span>
              )}
              {networkQuality === "offline" && (
                <span className="text-[9px] font-bold text-red-400 bg-red-400/15 px-1.5 py-0.5 rounded-full">OFFLINE</span>
              )}
            </div>
          </div>

          {/* Main content — toggles between album art and lyrics */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {showMobileQueue ? (
              <div className="flex-1 overflow-y-auto px-6 pt-2 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-bold text-white">Queue</p>
                    <p className="text-xs text-neutral-400">
                      {upcomingCount > 0 ? `${upcomingCount} up next` : "No upcoming tracks yet"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={randomizeQueue}
                      disabled={upcomingCount < 2}
                      className="text-[10px] font-bold uppercase tracking-wide border border-neutral-700 rounded-full px-3 py-1.5 text-white disabled:opacity-40"
                    >
                      Random
                    </button>
                    <button
                      onClick={clearQueue}
                      disabled={upcomingCount === 0}
                      className="text-[10px] font-bold uppercase tracking-wide border border-neutral-700 rounded-full px-3 py-1.5 text-white disabled:opacity-40"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pb-10">
                  {queueEntries.map(({ track, index, isCurrent, isPlayed }) => (
                    <div
                      key={`${track.id}-${index}`}
                      className={`flex items-center gap-3 rounded-xl px-3 py-3 ${isCurrent ? "bg-white/10" : "bg-white/5"}`}
                    >
                      <button
                        onClick={() => playTrack(track, queue)}
                        className="flex items-center gap-3 min-w-0 flex-1 text-left"
                      >
                        <img
                          src={track.cover || "/placeholder.svg"}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-semibold truncate ${isCurrent ? "text-green-400" : "text-white"}`}>
                            {track.title}
                          </p>
                          <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
                        </div>
                      </button>
                      {isCurrent ? (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-green-400">Now</span>
                      ) : isPlayed ? (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Played</span>
                      ) : (
                        <button
                          onClick={() => removeFromQueue(track.id)}
                          className="text-neutral-400 active:scale-90 transition"
                          title="Remove from queue"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 13H5v-2h14v2z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : !showLyrics ? (
              /* Album Art View */
              <div className="flex-1 flex items-center justify-center px-8 pt-4">
                <div className="w-full max-w-[340px] aspect-square rounded-lg overflow-hidden shadow-2xl">
                  <img
                    src={currentTrack.cover || "/placeholder.svg"}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ) : (
              /* Lyrics View */
              <div
                ref={lyricsContainerRef}
                className="flex-1 overflow-y-auto px-6 pt-2 pb-4 scroll-smooth"
                style={{
                  maskImage: "linear-gradient(to bottom, transparent 0%, black 8%, black 85%, transparent 100%)",
                  WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 8%, black 85%, transparent 100%)",
                }}
              >
                {lyricsLoading ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <div className="relative w-10 h-10">
                      <div className="absolute inset-0 rounded-full border-2 border-neutral-700" />
                      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-green-400 animate-spin" />
                    </div>
                    <p className="text-neutral-500 text-xs tracking-widest uppercase">Fetching lyrics</p>
                  </div>
                ) : lyricsError ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="text-neutral-500">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                    </div>
                    <p className="text-neutral-500 text-sm font-medium">No lyrics available</p>
                    <p className="text-neutral-600 text-xs">for this track</p>
                  </div>
                ) : (
                  <div className="py-16 space-y-4">
                    {lyrics.map((line, index) => {
                      const isActive = index === activeIndex;
                      const isPast = index < activeIndex;
                      const isEmpty = line.words.trim() === "";

                      if (isEmpty) {
                        return <div key={index} className="h-6" />;
                      }

                      // Proximity-based opacity: lines closer to active are more visible
                      const distance = Math.abs(index - activeIndex);
                      const proximityOpacity = isActive ? 1 : distance <= 1 ? 0.45 : distance <= 2 ? 0.25 : distance <= 4 ? 0.15 : 0.08;

                      return (
                        <p
                          key={index}
                          ref={isActive ? activeLineRef : null}
                          onClick={() => seek(parseInt(line.startTimeMs) / 1000)}
                          className={`font-black leading-[1.15] cursor-pointer transition-all duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${
                            isActive
                              ? "text-white text-[2rem] scale-[1.02] origin-left py-1"
                              : isPast
                              ? `text-white text-[1.55rem]`
                              : `text-white text-[1.55rem]`
                          }`}
                          style={{
                            opacity: isActive ? 1 : proximityOpacity,
                            ...(isActive ? {
                              textShadow: "0 0 60px rgba(30, 215, 96, 0.5), 0 0 120px rgba(30, 215, 96, 0.15), 0 4px 30px rgba(0,0,0,0.6)",
                              filter: "brightness(1.15)",
                            } : {}),
                          }}
                        >
                          {line.words}
                        </p>
                      );
                    })}
                    <div className="h-48" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Song Info + Like */}
          <div className="px-8 mb-2">
            <div className="flex items-center justify-between">
              <div className="flex-1 overflow-hidden mr-4">
                <h2 className="text-white text-xl font-bold truncate">
                  {currentTrack.title}
                </h2>
                <p className="text-neutral-400 text-sm truncate mt-0.5">
                  {currentTrack.artist}
                </p>
              </div>
              <button
                onClick={handleLike}
                className={`text-2xl transition-transform active:scale-125 ${
                  isLiked ? "text-green-500" : "text-neutral-400"
                }`}
              >
                {isLiked ? "❤️" : "🤍"}
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="px-8 mb-2">
            <div
              className="relative w-full h-2 bg-neutral-700 rounded-full cursor-pointer group"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = x / rect.width;
                seek(Math.max(0, Math.min(percentage * duration, duration)));
              }}
              onTouchStart={() => setIsDragging(true)}
              onTouchEnd={() => setIsDragging(false)}
              onTouchMove={(e) => {
                if (!isDragging) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.touches[0].clientX - rect.left;
                const percentage = Math.max(0, Math.min(x / rect.width, 1));
                seek(percentage * duration);
              }}
            >
              <div
                className="h-full bg-white rounded-full transition-all relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg transform translate-x-1/2 group-active:scale-125 transition" />
              </div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-neutral-400 font-medium">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Transport Controls */}
          <div className="flex items-center justify-between px-8 mb-1">
            {/* Shuffle */}
            <button
              onClick={toggleShuffle}
              className={`active:text-white transition p-2 ${isShuffling ? "text-green-500" : "text-neutral-400"}`}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
              </svg>
              {isShuffling && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-green-500 rounded-full"></span>
              )}
            </button>

            {/* Previous */}
            <button
              onClick={prevTrack}
              className="text-white active:scale-90 transition p-2"
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="bg-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg active:scale-95 transition"
            >
              {isBuffering ? (
                <div className="w-7 h-7 relative">
                  <div className="absolute inset-0 rounded-full border-[2.5px] border-neutral-300" />
                  <div className="absolute inset-0 rounded-full border-[2.5px] border-transparent border-t-black animate-spin" />
                </div>
              ) : isPlaying ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="#000">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="#000">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Next */}
            <button
              onClick={nextTrack}
              className="text-white active:scale-90 transition p-2"
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>

            {/* Repeat / Loop */}
            <button
              onClick={toggleLoop}
              className={`relative active:text-white transition p-2 ${isLooping ? "text-green-500" : "text-neutral-400"}`}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
              </svg>
              {isLooping && (
                <span className="absolute -top-0.5 -right-0.5 text-[9px] font-black text-green-500">1</span>
              )}
            </button>
          </div>

          {/* Lyrics Toggle Button */}
          <div className="flex justify-center pb-6 pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowMobileQueue(false);
                  setShowLyrics((prev) => !prev);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                  showLyrics && !showMobileQueue
                    ? "bg-green-500 text-black"
                    : "bg-neutral-800 text-neutral-400 active:bg-neutral-700"
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
                Lyrics
              </button>
              <button
                onClick={() => {
                  setShowLyrics(false);
                  setShowMobileQueue((prev) => !prev);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                  showMobileQueue
                    ? "bg-green-500 text-black"
                    : "bg-neutral-800 text-neutral-400 active:bg-neutral-700"
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 17h10v-2H3v2zm0-4h14v-2H3v2zm0-6v2h14V7H3zm17 4v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4z" />
                </svg>
                Queue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================
           DESKTOP PLAYER (bottom bar)
         ============================================ */}
      <div className="hidden md:flex fixed bottom-0 left-0 right-0 bg-black border-t border-neutral-800 p-4 z-40 items-center justify-between">
        <div className="flex items-center gap-4 w-1/3">
          <img
            src={currentTrack.cover || "/placeholder.svg"}
            className="w-14 h-14 rounded-md"
            alt=""
          />
          <div>
            <h4 className="text-white text-sm font-bold">
              {currentTrack.title}
            </h4>
            <p className="text-neutral-400 text-xs">
              {currentTrack.artist}
            </p>
          </div>
          <button
            onClick={handleLike}
            className={`ml-2 transition hover:scale-110 ${
              isLiked ? "text-green-500" : "text-neutral-400 hover:text-white"
            }`}
          >
            {isLiked ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-green-500">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            )}
          </button>
        </div>

        <div className="flex flex-col items-center max-w-[45%] w-full">
          <div className="flex items-center gap-5 mb-2">
            {/* Shuffle (desktop) */}
            <button
              onClick={toggleShuffle}
              className={`relative transition hover:scale-110 p-1.5 rounded-full ${isShuffling ? "text-green-500 bg-green-500/10" : "text-neutral-400 hover:text-white"}`}
              title={isShuffling ? "Shuffle: On" : "Shuffle: Off"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
              </svg>
              {isShuffling && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-green-500 rounded-full"></span>
              )}
            </button>
            <button
              onClick={prevTrack}
              className="text-neutral-400 hover:text-white transition-colors active:scale-90"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>
            <button
              onClick={togglePlay}
              className="w-9 h-9 bg-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
            >
              {isBuffering ? (
                <div className="w-4 h-4 relative">
                  <div className="absolute inset-0 rounded-full border-2 border-neutral-300" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-black animate-spin" />
                </div>
              ) : isPlaying ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#000">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#000">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <button
              onClick={nextTrack}
              className="text-neutral-400 hover:text-white transition-colors active:scale-90"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>
            {/* Loop */}
            <button
              onClick={toggleLoop}
              className={`relative transition hover:scale-110 p-1.5 rounded-full ${isLooping ? "text-green-500 bg-green-500/10" : "text-neutral-400 hover:text-white"}`}
              title={isLooping ? "Loop: On" : "Loop: Off"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
              </svg>
              {isLooping && (
                <span className="absolute -top-0.5 -right-0.5 text-[8px] font-black text-green-500">1</span>
              )}
            </button>
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

        <div className="w-1/3 flex justify-end items-center gap-3 pr-2">
          {/* Lyrics toggle */}
          <button
            onClick={() => setShowDesktopLyrics(!showDesktopLyrics)}
            className={`transition hover:scale-110 p-1.5 rounded-full ${showDesktopLyrics ? "text-green-500 bg-green-500/10" : "text-neutral-400 hover:text-white"}`}
            title="Lyrics"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </button>

          {/* Volume control */}
          <div className="flex items-center gap-2 ml-1">
            <button
              onClick={() => {
                if (volume > 0) {
                  prevVolumeRef.current = volume;
                  setVolume(0);
                } else {
                  setVolume(prevVolumeRef.current || 1);
                }
              }}
              className="text-neutral-400 hover:text-white transition p-1"
              title={volume === 0 ? "Unmute" : "Mute"}
            >
              {volume === 0 ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              ) : volume < 0.5 ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-24 accent-green-500 h-1 bg-neutral-600 rounded-lg appearance-none cursor-pointer"
              title={`Volume: ${Math.round(volume * 100)}%`}
            />
          </div>
        </div>
      </div>

      {/* Playback error banner (desktop) */}
      {playbackError && (
        <div className="hidden md:flex fixed bottom-[76px] left-64 right-0 z-50 px-4">
          <div className="w-full bg-red-500/90 backdrop-blur-sm text-white text-sm font-medium px-5 py-3 rounded-t-lg flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{playbackError}</span>
              {networkQuality !== "fast" && (
                <span className="text-xs opacity-75">({networkQuality} network)</span>
              )}
            </div>
            <button
              onClick={retryPlayback}
              className="flex-shrink-0 bg-white/20 hover:bg-white/30 text-white text-sm font-bold px-4 py-1.5 rounded-md transition"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Playback error banner (mobile — in big player) */}
      {playbackError && showBigPlayer && (
        <div className="md:hidden fixed bottom-28 left-4 right-4 z-[101]">
          <div className="bg-red-500/90 backdrop-blur-sm text-white text-xs font-medium px-4 py-2.5 rounded-lg flex items-center justify-between gap-2 shadow-lg">
            <span className="truncate">{playbackError}</span>
            <button
              onClick={retryPlayback}
              className="flex-shrink-0 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1 rounded-md transition"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Floating desktop lyrics panel and queue panel removed — 
           now handled by FullScreenLyrics and NowPlayingPanel components */}

      {/* Animations */}
      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slideUp {
          animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out;
        }
      `}</style>
    </>
  );
}
