"use client";

import { usePlayer } from "@/contexts/PlayerContext";
import Link from "next/link";

export default function NowPlayingPanel() {
  const { currentTrack, queue, currentIndex, playTrack, likedSongs, toggleLikeSong } = usePlayer();

  if (!currentTrack) return null;

  const isLiked = likedSongs.has(currentTrack.id);
  const nextTracks = queue.slice(currentIndex + 1, currentIndex + 6);
  const artistName = currentTrack.artist?.split(",")[0]?.trim() || "Unknown";

  return (
    <div className="hidden md:flex w-[280px] flex-col h-full flex-shrink-0 animate-slideInFromRight">
      <div className="bg-neutral-950 rounded-lg flex-1 flex flex-col min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
        
        {/* Header */}
        <div className="sticky top-0 z-10 bg-neutral-950/95 backdrop-blur-md px-4 pt-4 pb-2 flex items-center justify-between">
          <p className="text-sm font-bold text-white truncate">{currentTrack.title}</p>
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="5" r="1" fill="currentColor" />
                <circle cx="12" cy="12" r="1" fill="currentColor" />
                <circle cx="12" cy="19" r="1" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>

        {/* Album Art */}
        <div className="px-4 pb-4">
          <div className="rounded-lg overflow-hidden shadow-2xl">
            <img
              src={currentTrack.cover || "/placeholder.svg"}
              alt={currentTrack.title}
              className="w-full aspect-square object-cover"
            />
          </div>
        </div>

        {/* Track Info */}
        <div className="px-4 pb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-white truncate">{currentTrack.title}</h3>
              <p className="text-sm text-neutral-400 truncate">{currentTrack.artist}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 mt-1">
              <button
                onClick={() => toggleLikeSong(currentTrack)}
                className={`transition-all duration-200 btn-press ${isLiked ? 'text-green-500' : 'text-neutral-400 hover:text-white'}`}
              >
                {isLiked ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Credits */}
        <div className="mx-4 mb-4 bg-neutral-900 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-white">Credits</h4>
            <span className="text-xs text-neutral-400 hover:text-white cursor-pointer transition-colors">Show all</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">{artistName}</p>
              <p className="text-xs text-neutral-400">Main Artist</p>
            </div>
            <button className="text-xs font-bold border border-neutral-600 rounded-full px-3 py-1 text-white hover:border-white hover:scale-105 transition-all">
              Follow
            </button>
          </div>
        </div>

        {/* Queue */}
        <div className="mx-4 mb-4 bg-neutral-900 rounded-lg p-4">
          {nextTracks.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-white">Next in queue</h4>
                <span className="text-xs text-neutral-400 hover:text-white cursor-pointer transition-colors">Open queue</span>
              </div>
              {nextTracks.map((track, i) => (
                <div
                  key={`${track.id}-${i}`}
                  className="flex items-center gap-3 py-2 rounded-md hover:bg-white/5 px-2 -mx-2 cursor-pointer transition-colors group"
                  onClick={() => playTrack(track, queue)}
                >
                  <img
                    src={track.cover || "/placeholder.svg"}
                    alt=""
                    className="w-10 h-10 rounded object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate group-hover:text-green-400 transition-colors">{track.title}</p>
                    <p className="text-xs text-neutral-500 truncate">{track.artist}</p>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div>
              <h4 className="text-sm font-bold text-white mb-2">Your queue is empty</h4>
              <Link
                href="/dashboard/search"
                className="inline-flex items-center text-xs font-bold border border-neutral-600 rounded-full px-3 py-1.5 text-white hover:border-white hover:scale-105 transition-all"
              >
                Search for something new
              </Link>
            </div>
          )}
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}
