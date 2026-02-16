"use client";

import { usePlayer } from "@/contexts/PlayerContext";
import { useState } from "react";

export default function Player() {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    nextTrack,
    prevTrack,
    currentTime,
    duration,
    seek,
    likedSongs,
    toggleLikeSong,
  } = usePlayer();

  const [showBigPlayer, setShowBigPlayer] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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
        {/* Progress thin line */}
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

        <div className="flex items-center gap-3 pr-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="text-white text-2xl focus:outline-none"
          >
            {isPlaying ? "⏸" : "▶"}
          </button>
        </div>
      </div>

      {/* ============================================
           FULL-SCREEN BIG PLAYER (Mobile)
         ============================================ */}
      {showBigPlayer && (
        <div className="md:hidden fixed inset-0 z-[100] flex flex-col bg-gradient-to-b from-neutral-800 via-neutral-900 to-black animate-slideUp">
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 pt-4 pb-4">
            <button
              onClick={() => setShowBigPlayer(false)}
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
            <div className="w-10" /> {/* spacer */}
          </div>

          {/* Album Art */}
          <div className="flex-1 flex items-center justify-center px-8 pt-4">
  <div className="w-full max-w-[340px] aspect-square rounded-lg overflow-hidden shadow-2xl">
              <img
                src={currentTrack.cover || "/placeholder.svg"}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            </div>
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
                {/* Thumb */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg transform translate-x-1/2 group-active:scale-125 transition" />
              </div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-neutral-400 font-medium">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Transport Controls */}
          <div className="flex items-center justify-between px-8 mb-2">
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

            {/* Repeat */}
            <button className="text-neutral-400 active:text-white transition p-2">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
              </svg>
            </button>
          </div>

          {/* Bottom safe area spacer */}
          <div className="h-8" />
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
            {isLiked ? "❤️" : "🤍"}
          </button>
        </div>

        <div className="flex flex-col items-center max-w-[45%] w-full">
          <div className="flex gap-6 mb-2">
            <button
              onClick={prevTrack}
              className="hover:text-white text-neutral-400"
            >
              ⏮
            </button>
            <button
              onClick={togglePlay}
              className="text-white bg-white/10 rounded-full p-1 hover:scale-105 transition"
            >
              {isPlaying ? "⏸" : "▶"}
            </button>
            <button
              onClick={nextTrack}
              className="hover:text-white text-neutral-400"
            >
              ⏭
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

        <div className="w-1/3 flex justify-end">
          {/* Volume or other controls could go here */}
        </div>
      </div>

      {/* Slide-up animation */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1);
        }
      `}</style>
    </>
  );
}