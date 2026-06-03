"use client";

import { usePlayer } from "@/contexts/PlayerContext";
import { useState, memo } from "react";
import dynamic from "next/dynamic";

const SaveToPlaylistMenu = dynamic(() => import("./SaveToPlaylistMenu"), { ssr: false });

interface SongRowProps {
  track: any;
  index: number;
  onDownload: (track: any) => Promise<void>;
  onRemove?: (track: any) => void;
  showRemoveButton?: boolean;
  hidePlaylistButton?: boolean;
  allTracks?: any[];
}

function SongRow({
  track,
  index,
  onDownload,
  onRemove,
  showRemoveButton = false,
  hidePlaylistButton = false,
  allTracks = [],
}: SongRowProps) {
  const {
    playTrack,
    addToQueue,
    currentTrack,
    isPlaying,
    togglePlay,
    downloadedSongs,
    refreshLibrary,
    likedSongs,
    toggleLikeSong,
  } = usePlayer();

  const [isHovered, setIsHovered] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [showQueueToast, setShowQueueToast] = useState(false);

  const isCurrentTrack = currentTrack?.id === track.id;
  const isDownloaded = downloadedSongs.has(track.id);
  const isLiked = likedSongs.has(track.id);

  /* =========================
     ROW CLICK PLAY/PAUSE LOGIC
  ========================== */

  const buildTrackObj = (t: any, storageUrl: string) => ({
    id: t.id,
    title: t.name || t.title,
    artist: t.artists ? t.artists.map((a: any) => a.name).join(", ") : t.artist,
    cover: t.album?.images?.[0]?.url || t.cover_url,
    url: storageUrl,
    duration: t.duration_ms || t.duration, 
    album: t.album?.name || t.album,
  });

  /**
   * Resolve the audio URL for a track.
   * Downloaded → direct Supabase public URL (fast, supports Range/seeking).
   * Not downloaded → /api/stream proxy (streams via RapidAPI on-the-fly).
   */
  const getAudioUrl = async (t: any): Promise<string> => {
    if (downloadedSongs.has(t.id)) {
      // Fetch storage_path from the download endpoint (returns existing song instantly)
      try {
        const r = await fetch("/api/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trackId: t.id }),
        });
        const d = await r.json();
        if (d.song?.storage_path) {
          return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/music/${d.song.storage_path}`;
        }
      } catch {
        // fall through to stream URL
      }
    }
    // Not downloaded or lookup failed → use streaming proxy
    return `/api/stream/${t.id}`;
  };

  const handleRowClick = async () => {
    try {
      // If clicking currently playing track → toggle pause/play
      if (isCurrentTrack) {
        togglePlay();
        return;
      }

      const audioUrl = await getAudioUrl(track);
      const clickedTrack = buildTrackObj(track, audioUrl);

      // Build queue from ALL tracks on this page (not just downloaded)
      if (allTracks.length > 1) {
        const queue = allTracks.map((t) => {
          if (t.id === track.id) return clickedTrack;
          // Downloaded songs with a known storage_path → fast Supabase URL
          // Otherwise → stream proxy
          const url = (downloadedSongs.has(t.id) && t.storage_path)
            ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/music/${t.storage_path}`
            : `/api/stream/${t.id}`;
          return buildTrackObj(t, url);
        });
        playTrack(clickedTrack, queue);
      } else {
        playTrack(clickedTrack);
      }
    } catch {
    }
  };


  const handleDownloadClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloading) return;

    // Start playing immediately via stream (don't wait for download)
    if (!isCurrentTrack) {
      const streamUrl = `/api/stream/${track.id}`;
      const streamTrack = buildTrackObj(track, streamUrl);
      playTrack(streamTrack);
    }

    // Save to Supabase in background
    try {
      setIsDownloading(true);
      await onDownload(track);
      await refreshLibrary();
    } finally {
      setIsDownloading(false);
    }
  };

  const handleAddToQueue = async (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const audioUrl = await getAudioUrl(track);
      addToQueue(buildTrackObj(track, audioUrl));
      setShowQueueToast(true);
      setTimeout(() => setShowQueueToast(false), 2000);
    } catch {
    }
  };

  /* =========================
     LIKE
  ========================== */

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLiking) return;

    try {
      setIsLiking(true);

      const songData = {
        spotify_id: track.id,
        title: track.name || track.title || "Unknown",
        artist: track.artists
          ? track.artists.map((a: any) => a.name).join(", ")
          : track.artist || "Unknown",
        album: track.album?.name || (typeof track.album === "string" ? track.album : null),
        cover_url:
          track.album?.images?.[0]?.url ||
          track.cover_url ||
          null,
        duration_ms: track.duration_ms || null,
      };

      await toggleLikeSong(songData);
    } finally {
      setIsLiking(false);
    }
  };

  const artistName = track.artists
    ? track.artists.map((a: any) => a.name).join(", ")
    : track.artist || "Unknown";

  const albumName =
    track.album?.name || (typeof track.album === "string" ? track.album : "Unknown Album");

  const coverImg =
    track.album?.images?.[2]?.url ||
    track.album?.images?.[0]?.url ||
    track.cover_url ||
    "/placeholder.svg";

  const addedDate = track.added_at || track.created_at;

  const duration = track.duration_ms
    ? `${Math.floor(track.duration_ms / 60000)}:${(
        (track.duration_ms % 60000) /
        1000
      )
        .toFixed(0)
        .padStart(2, "0")}`
    : addedDate
    ? new Date(addedDate).toLocaleDateString()
    : "--:--";

  return (
    <tr
      className={`hover:bg-white/10 transition-all duration-200 group rounded-md cursor-pointer row-hover ${showPlaylistMenu ? "relative z-50" : "relative"}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleRowClick}  
    >
      {/* # Column */}
      <td className="py-3 px-2 rounded-l-md text-center w-12">
        {isHovered ? (
          <span className="text-white">
            {isCurrentTrack && isPlaying ? "⏸" : "▶"}
          </span>
        ) : (
          <span className={isCurrentTrack ? "text-green-500" : "text-neutral-400"}>
            {index + 1}
          </span>
        )}
      </td>

      {/* Title Column */}
      <td className="py-3">
        <div className="flex items-center gap-4">
          <img
            src={coverImg}
            alt={track.name || track.title}
            className="w-10 h-10 rounded-sm object-cover"
          />
          <div>
            <p className={`font-semibold ${isCurrentTrack ? "text-green-500" : "text-white"}`}>
              {track.name || track.title}
            </p>
            <p className="text-sm text-neutral-400">
              {artistName}
            </p>
          </div>
        </div>
      </td>

      {/* Album */}
      <td className="py-3 text-neutral-400 hidden md:table-cell">
        {albumName}
      </td>

      {/* Duration */}
      <td className="py-3 text-right text-neutral-400 hidden md:table-cell">
        {duration}
      </td>

      {/* Actions */}
      <td className="py-3 text-right text-neutral-400 rounded-r-md">
        <div className="flex items-center justify-end gap-2 px-2 relative">

          <button
            onClick={handleLike}
            disabled={isLiking}
            className={`transition hover:scale-110 ${
              isLiked
                ? "text-green-500"
                : "text-neutral-400 hover:text-white"
            } ${isLiking ? "animate-pulse" : ""}`}
          >
            {isLiked ? "❤️" : "🤍"}
          </button>

          <button
            onClick={handleAddToQueue}
            className="text-neutral-400 hover:text-white transition hover:scale-110"
            title="Add to queue"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 17h10v-2H3v2zm0-4h14v-2H3v2zm0-6v2h14V7H3zm17 4v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4z" />
            </svg>
          </button>

          {!hidePlaylistButton && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPlaylistMenu(!showPlaylistMenu);
              }}
              className={`transition hover:scale-110 p-1 rounded ${
                showPlaylistMenu
                  ? "text-green-400"
                  : "text-neutral-400 hover:text-white"
              }`}
              title="Add to playlist"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 10H2v2h12v-2zm0-4H2v2h12V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM2 16h8v-2H2v2z"/>
              </svg>
            </button>
          )}

          {showPlaylistMenu && (
            <SaveToPlaylistMenu
              track={track}
              onClose={() => setShowPlaylistMenu(false)}
            />
          )}

          {isDownloaded ? (
            <span className="text-green-500" title="Saved to Cloud">✔</span>
          ) : (
            <button
              onClick={handleDownloadClick}
              disabled={isDownloading}
              className={`transition hover:scale-110 ${
                isDownloading
                  ? "animate-pulse text-blue-400"
                  : "text-neutral-600 hover:text-white"
              }`}
              title="Save to Cloud"
            >
              {isDownloading ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="animate-spin">
                  <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" opacity="0.3"/>
                  <path d="M20 12h2A10 10 0 0 0 12 2v2a8 8 0 0 1 8 8z"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
                </svg>
              )}
            </button>
          )}

          {showRemoveButton && onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(track);
              }}
              className="text-neutral-400 hover:text-red-400 transition hover:scale-110"
            >
              ✕
            </button>
          )}
        </div>
      </td>
      <QueueToast show={showQueueToast} />
    </tr>
  );
}

function QueueToast({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-full text-xs font-bold shadow-2xl animate-bounce z-[100] pointer-events-none">
      Added to Queue
    </div>
  );
}

export default memo(SongRow);
