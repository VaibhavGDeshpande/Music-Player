"use client";

import { usePlayer } from "@/contexts/PlayerContext";
import { useState } from "react";
import SaveToPlaylistMenu from "./SaveToPlaylistMenu";

interface SongRowProps {
  track: any;
  index: number;
  onDownload: (track: any) => Promise<void>;
  onRemove?: (track: any) => void;
  showRemoveButton?: boolean;
  hidePlaylistButton?: boolean;
}

export default function SongRow({
  track,
  index,
  onDownload,
  onRemove,
  showRemoveButton = false,
  hidePlaylistButton = false,
}: SongRowProps) {
  const {
    playTrack,
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

  const isCurrentTrack = currentTrack?.id === track.id;
  const isDownloaded = downloadedSongs.has(track.id);
  const isLiked = likedSongs.has(track.id);

  /* =========================
     ROW CLICK PLAY/PAUSE LOGIC
  ========================== */

  const handleRowClick = async () => {
    try {
      // If clicking currently playing track → toggle pause/play
      if (isCurrentTrack) {
        togglePlay();
        return;
      }

      // Must be downloaded first
      if (!isDownloaded) {
        alert("Please 'Save to Cloud' this song first to play it!");
        return;
      }

      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId: track.id }),
      });

      const data = await res.json();
      if (!data.song) return;

      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/music/${data.song.storage_path}`;

      playTrack({
        id: track.id,
        title: track.name || track.title,
        artist: track.artists
          ? track.artists.map((a: any) => a.name).join(", ")
          : track.artist,
        cover:
          track.album?.images?.[0]?.url || track.cover_url,
        url: publicUrl,
      });
    } catch (error) {
      console.error("Playback error:", error);
    }
  };

  /* =========================
     DOWNLOAD
  ========================== */

  const handleDownloadClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloading) return;

    try {
      setIsDownloading(true);
      await onDownload(track);
      refreshLibrary();
    } finally {
      setIsDownloading(false);
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
        album: track.album?.name || track.album || null,
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
    track.album?.name || track.album || "Unknown Album";

  const coverImg =
    track.album?.images?.[2]?.url ||
    track.album?.images?.[0]?.url ||
    track.cover_url ||
    "/placeholder.png";

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
      className="hover:bg-white/10 transition group rounded-md relative cursor-pointer"
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

          {!hidePlaylistButton && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPlaylistMenu(!showPlaylistMenu);
              }}
              className="text-neutral-400 hover:text-white transition hover:scale-110"
            >
              ➕
            </button>
          )}

          {showPlaylistMenu && (
            <SaveToPlaylistMenu
              track={track}
              onClose={() => setShowPlaylistMenu(false)}
            />
          )}

          {isDownloaded ? (
            <span className="text-green-500">✔</span>
          ) : (
            <button
              onClick={handleDownloadClick}
              disabled={isDownloading}
              className={`hover:text-white ${
                isDownloading
                  ? "animate-pulse text-blue-400"
                  : ""
              }`}
            >
              {isDownloading ? "..." : "⬇"}
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
    </tr>
  );
}