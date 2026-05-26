"use client";

import { usePlayer } from "@/contexts/PlayerContext";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function NowPlayingPanel() {
  const {
    currentTrack,
    queue,
    currentIndex,
    playTrack,
    removeFromQueue,
    clearQueue,
    randomizeQueue,
    likedSongs,
    toggleLikeSong,
    isPlaying,
    togglePlay,
  } = usePlayer();

  const [isVideoMode, setIsVideoMode] = useState(false);
  const [showFullQueue, setShowFullQueue] = useState(false);

  useEffect(() => {
    setIsVideoMode(false);
  }, [currentTrack?.id]);

  useEffect(() => {
    if (isVideoMode && isPlaying) {
      togglePlay();
    }
  }, [isVideoMode, isPlaying, togglePlay]);

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

  if (!currentTrack) return null;

  const isLiked = likedSongs.has(currentTrack.id);
  const nextTracks = queue.slice(currentIndex + 1, currentIndex + 6);
  const upcomingCount = Math.max(queue.length - currentIndex - 1, 0);
  const artistName = currentTrack.artist?.split(",")[0]?.trim() || "Unknown";

  return (
    <div className="hidden md:flex w-[300px] flex-col h-full flex-shrink-0 animate-slideInFromRight">
      <div
        className="bg-neutral-950 rounded-lg flex-1 flex flex-col min-h-0 overflow-y-auto"
        style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}
      >
        <div className="sticky top-0 z-10 bg-neutral-950/95 backdrop-blur-md px-4 pt-4 pb-2 flex items-center justify-between">
          <p className="text-sm font-bold text-white truncate">{currentTrack.title}</p>
          <button
            onClick={() => setShowFullQueue((prev) => !prev)}
            className="text-xs font-bold text-neutral-400 hover:text-white transition-colors"
          >
            {showFullQueue ? "Close queue" : `Queue ${upcomingCount > 0 ? `(${upcomingCount})` : ""}`}
          </button>
        </div>

        <div className="px-4 pb-4">
          <div className="flex justify-center mb-3">
            <div className="bg-neutral-800 rounded-full p-1 flex items-center text-xs font-medium w-fit">
              <button
                onClick={() => setIsVideoMode(false)}
                className={`px-4 py-1.5 rounded-full transition-colors ${!isVideoMode ? "bg-neutral-600 text-white" : "text-neutral-400 hover:text-white"}`}
              >
                Song
              </button>
              <button
                onClick={() => setIsVideoMode(true)}
                className={`px-4 py-1.5 rounded-full transition-colors ${isVideoMode ? "bg-neutral-600 text-white" : "text-neutral-400 hover:text-white"}`}
              >
                Video
              </button>
            </div>
          </div>

          <div className="rounded-lg overflow-hidden shadow-2xl relative group bg-black aspect-square">
            {!isVideoMode ? (
              <>
                <img
                  src={currentTrack.cover || "/placeholder.svg"}
                  alt={currentTrack.title}
                  className="w-full aspect-square object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                  <button
                    onClick={() => setIsVideoMode(true)}
                    className="bg-red-600 hover:bg-red-700 text-white rounded-full p-4 shadow-xl transform hover:scale-110 transition-all pointer-events-auto flex items-center justify-center cursor-pointer"
                    title="Watch Video"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M21.582,6.186c-0.23-0.86-0.908-1.538-1.768-1.768C18.254,4,12,4,12,4S5.746,4,4.186,4.418 c-0.86,0.23-1.538,0.908-1.768,1.768C2,7.746,2,12,2,12s0,4.254,0.418,5.814c0.23,0.86,0.908,1.538,1.768,1.768 C5.746,20,12,20,12,20s6.254,0,7.814-0.418c0.86-0.23,1.538-0.908,1.768-1.768C22,16.254,22,12,22,12S22,7.746,21.582,6.186z M9.996,15.005l0-6.01l5.518,3.005L9.996,15.005z" />
                    </svg>
                  </button>
                </div>
              </>
            ) : (
              <iframe
                key={currentTrack.id}
                className="w-full h-full absolute inset-0 rounded-lg bg-black"
                src={`/api/video/${currentTrack.id}`}
                title={`${currentTrack.title} video`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            )}
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-white truncate">{currentTrack.title}</h3>
              <p className="text-sm text-neutral-400 truncate">{currentTrack.artist}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 mt-1">
              <button
                onClick={() => toggleLikeSong(currentTrack)}
                className={`transition-all duration-200 btn-press ${isLiked ? "text-green-500" : "text-neutral-400 hover:text-white"}`}
              >
                {isLiked ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="mx-4 mb-4 bg-neutral-900 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-white">Credits</h4>
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

        <div className="mx-4 mb-4 bg-neutral-900 rounded-lg p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h4 className="text-sm font-bold text-white">Queue</h4>
              <p className="text-xs text-neutral-400">
                {upcomingCount > 0 ? `${upcomingCount} track${upcomingCount === 1 ? "" : "s"} up next` : "Add tracks from any list with the queue button"}
              </p>
            </div>
            <button
              onClick={() => setShowFullQueue((prev) => !prev)}
              className="text-xs font-bold text-neutral-400 hover:text-white transition-colors"
            >
              {showFullQueue ? "Collapse" : "Expand"}
            </button>
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={randomizeQueue}
              disabled={upcomingCount < 2}
              className="text-xs font-bold border border-neutral-700 rounded-full px-3 py-1.5 text-white hover:border-white transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Random Queue
            </button>
            <button
              onClick={clearQueue}
              disabled={upcomingCount === 0}
              className="text-xs font-bold border border-neutral-700 rounded-full px-3 py-1.5 text-white hover:border-white transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Clear Queue
            </button>
          </div>

          {showFullQueue ? (
            queueEntries.length > 0 ? (
              <div className="space-y-2">
                {queueEntries.map(({ track, index, isCurrent, isPlayed }) => (
                  <div
                    key={`${track.id}-${index}`}
                    className={`flex items-center gap-3 rounded-md px-2 py-2 transition-colors ${isCurrent ? "bg-white/10" : "hover:bg-white/5"}`}
                  >
                    <button
                      onClick={() => playTrack(track, queue)}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left"
                    >
                      <img
                        src={track.cover || "/placeholder.svg"}
                        alt=""
                        className="w-10 h-10 rounded object-cover flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium truncate ${isCurrent ? "text-green-400" : "text-white"}`}>
                          {track.title}
                        </p>
                        <p className="text-xs text-neutral-500 truncate">{track.artist}</p>
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      {isCurrent ? (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-green-400">Now</span>
                      ) : isPlayed ? (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Played</span>
                      ) : (
                        <button
                          onClick={() => removeFromQueue(track.id)}
                          className="text-neutral-500 hover:text-white transition-colors"
                          title="Remove from queue"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 13H5v-2h14v2z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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
            )
          ) : nextTracks.length > 0 ? (
            <div className="space-y-2">
              {nextTracks.map((track, index) => (
                <div
                  key={`${track.id}-${index}`}
                  className="flex items-center gap-3 py-2 rounded-md hover:bg-white/5 px-2 -mx-2 transition-colors group"
                >
                  <button
                    onClick={() => playTrack(track, queue)}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left"
                  >
                    <img
                      src={track.cover || "/placeholder.svg"}
                      alt=""
                      className="w-10 h-10 rounded object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate group-hover:text-green-400 transition-colors">
                        {track.title}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">{track.artist}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => removeFromQueue(track.id)}
                    className="text-neutral-500 hover:text-white transition-colors"
                    title="Remove from queue"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 13H5v-2h14v2z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <h4 className="text-sm font-bold text-white mb-2">Your queue is empty</h4>
              <p className="text-xs text-neutral-400 mb-3">Add tracks from search results and they will play after the current song.</p>
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
