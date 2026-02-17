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
    togglePlay,
    nextTrack,
    prevTrack,
    isLooping,
    toggleLoop,
    currentTime,
    duration,
    seek,
    volume,
    setVolume,
    likedSongs,
    toggleLikeSong,
  } = usePlayer();

  const [showBigPlayer, setShowBigPlayer] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showDesktopLyrics, setShowDesktopLyrics] = useState(false);
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

  // Auto-scroll to active lyric
  useEffect(() => {
    if ((showLyrics || showDesktopLyrics) && activeLineRef.current && lyricsContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeIndex, showLyrics, showDesktopLyrics]);

  if (!currentTrack) return null;

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
            {isPlaying ? (
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
              onClick={() => { setShowBigPlayer(false); setShowLyrics(false); }}
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
            <div className="w-10" />
          </div>

          {/* Main content — toggles between album art and lyrics */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!showLyrics ? (
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
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <div className="w-8 h-8 border-2 border-neutral-600 border-t-green-500 rounded-full animate-spin" />
                    <p className="text-neutral-500 text-sm">Fetching lyrics...</p>
                  </div>
                ) : lyricsError ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2">
                    <p className="text-4xl opacity-30">♪</p>
                    <p className="text-neutral-500 text-sm">No lyrics available</p>
                  </div>
                ) : (
                  <div className="py-12 space-y-5">
                    {lyrics.map((line, index) => {
                      const isActive = index === activeIndex;
                      const isPast = index < activeIndex;
                      const isEmpty = line.words.trim() === "";

                      if (isEmpty) {
                        return <div key={index} className="h-8" />;
                      }

                      return (
                        <p
                          key={index}
                          ref={isActive ? activeLineRef : null}
                          onClick={() => seek(parseInt(line.startTimeMs) / 1000)}
                          className={`text-2xl font-extrabold leading-snug cursor-pointer transition-all duration-500 ease-out ${
                            isActive
                              ? "text-white scale-[1.03] origin-left"
                              : isPast
                              ? "text-white/30"
                              : "text-white/20"
                          }`}
                          style={isActive ? {
                            textShadow: "0 0 30px rgba(30, 215, 96, 0.3), 0 0 60px rgba(30, 215, 96, 0.1)",
                          } : undefined}
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
            <button className="text-neutral-400 active:text-white transition p-2">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
              </svg>
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
              {isPlaying ? (
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
            <button
              onClick={() => setShowLyrics(!showLyrics)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                showLyrics
                  ? "bg-green-500 text-black"
                  : "bg-neutral-800 text-neutral-400 active:bg-neutral-700"
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
              Lyrics
            </button>
          </div>
        </div>
      )}

      {/* ============================================
           DESKTOP PLAYER (bottom bar)
         ============================================ */}
      <div className="hidden md:flex fixed bottom-0 left-0 md:left-64 right-0 bg-black border-t border-neutral-800 p-4 z-40 items-center justify-between">
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
              {isPlaying ? (
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
            onClick={toggleLoop}
            className={`relative transition hover:scale-110 p-1.5 rounded-full ${isLooping ? "text-green-500 bg-green-500/10" : "text-neutral-400 hover:text-white"}`}
            title={isLooping ? "Loop: On" : "Loop: Off"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
            </svg>
            {isLooping && (
              <span className="absolute -top-0.5 -right-0.5 text-[8px] font-black text-green-500">1</span>
            )}
          </button>
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

      {/* ============================================
           DESKTOP LYRICS PANEL (floating above player)
         ============================================ */}
      {showDesktopLyrics && (
        <div className="hidden md:block fixed bottom-[76px] right-4 left-[17rem] z-30 animate-fadeIn">
          <div
            ref={!showLyrics ? lyricsContainerRef : undefined}
            className="bg-gradient-to-b from-neutral-900/98 to-black/98 backdrop-blur-2xl border border-neutral-700/50 rounded-2xl shadow-[0_-8px_40px_rgba(0,0,0,0.5)] max-h-[500px] overflow-y-auto p-8 scroll-smooth"
            style={{
              maskImage: "linear-gradient(to bottom, black 0%, black 80%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 80%, transparent 100%)",
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-green-500">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                </div>
                <h3 className="text-white font-bold text-lg tracking-tight">Lyrics</h3>
              </div>
              <button
                onClick={() => setShowDesktopLyrics(false)}
                className="text-neutral-500 hover:text-white transition p-1.5 rounded-full hover:bg-white/5"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {lyricsLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-8 h-8 border-2 border-neutral-700 border-t-green-500 rounded-full animate-spin" />
                <p className="text-neutral-500 text-sm">Fetching lyrics...</p>
              </div>
            ) : lyricsError ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <p className="text-4xl opacity-20">♪</p>
                <p className="text-neutral-600 text-sm">No lyrics available for this track</p>
              </div>
            ) : (
              <div className="space-y-4">
                {lyrics.map((line, index) => {
                  const isActive = index === activeIndex;
                  const isPast = index < activeIndex;
                  const isEmpty = line.words.trim() === "";

                  if (isEmpty) return <div key={index} className="h-5" />;

                  return (
                    <p
                      key={index}
                      ref={isActive ? activeLineRef : null}
                      onClick={() => seek(parseInt(line.startTimeMs) / 1000)}
                      className={`text-lg font-bold leading-relaxed cursor-pointer transition-all duration-500 ease-out rounded-md px-3 py-1 -mx-3 ${
                        isActive
                          ? "text-green-400 bg-green-500/5 scale-[1.01] origin-left"
                          : isPast
                          ? "text-neutral-500 hover:text-neutral-300"
                          : "text-neutral-700 hover:text-neutral-400"
                      }`}
                      style={isActive ? {
                        textShadow: "0 0 20px rgba(30, 215, 96, 0.25)",
                        borderLeft: "3px solid rgb(30, 215, 96)",
                        paddingLeft: "12px",
                      } : undefined}
                    >
                      {line.words}
                    </p>
                  );
                })}
                <div className="h-12" />
              </div>
            )}
          </div>
        </div>
      )}

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