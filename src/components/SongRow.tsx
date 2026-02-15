"use client";

import { usePlayer } from "@/contexts/PlayerContext";
import { useState } from "react";
import SaveToPlaylistMenu from "./SaveToPlaylistMenu";

interface SongRowProps {
  track: any;
  index: number;
  onDownload: (track: any) => Promise<void>;
  onRemove?: (track: any) => void;           // Optional remove-from-playlist callback
  showRemoveButton?: boolean;                 // Show ✕ button
  hidePlaylistButton?: boolean;               // Hide ➕ button
}

export default function SongRow({
  track,
  index,
  onDownload,
  onRemove,
  showRemoveButton = false,
  hidePlaylistButton = false,
}: SongRowProps) {
  const { playTrack, currentTrack, isPlaying, downloadedSongs, refreshLibrary, likedSongs, toggleLikeSong } = usePlayer();
  const [isHovered, setIsHovered] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  const isCurrentTrack = currentTrack?.id === track.id;
  const isDownloaded = downloadedSongs.has(track.id);
  const isLiked = likedSongs.has(track.id);

  const handlePlay = () => {
     if (isDownloaded) {
         fetch("/api/download", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ trackId: track.id }),
         })
         .then(res => res.json())
         .then(data => {
            if (data.song) {
               const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/music/${data.song.storage_path}`;
               playTrack({
                 id: track.id,
                 title: track.name || track.title,
                 artist: track.artists ? track.artists.map((a: any) => a.name).join(", ") : track.artist,
                 cover: track.album?.images?.[0]?.url || track.cover_url,
                 url: publicUrl,
               });
            }
         });
     } else {
         alert("Please 'Save to Cloud' this song first to play it!");
     }
  };

  const handleDownloadClick = async () => {
      setIsDownloading(true);
      await onDownload(track);
      setIsDownloading(false);
      refreshLibrary();
  };

  const handleLike = async () => {
    setIsLiking(true);
    const songData = {
      spotify_id: track.id,
      title: track.name || track.title || "Unknown",
      artist: track.artists
        ? track.artists.map((a: any) => a.name).join(", ")
        : track.artist || "Unknown",
      album: track.album?.name || track.album || null,
      cover_url: track.album?.images?.[0]?.url || track.cover_url || null,
      duration_ms: track.duration_ms || null,
    };
    await toggleLikeSong(songData);
    setIsLiking(false);
  };

  const artistName = track.artists
    ? track.artists.map((a: any) => a.name).join(", ")
    : track.artist || "Unknown";

  const albumName = track.album?.name || track.album || "Unknown Album";

  const coverImg =
    track.album?.images?.[2]?.url ||
    track.album?.images?.[0]?.url ||
    track.cover_url ||
    "/placeholder.png";

  const addedDate = track.added_at || track.created_at;
  const duration = track.duration_ms
    ? `${Math.floor(track.duration_ms / 60000)}:${((track.duration_ms % 60000) / 1000).toFixed(0).padStart(2, "0")}`
    : addedDate
      ? new Date(addedDate).toLocaleDateString()
      : "--:--";

  return (
    <tr
      className="hover:bg-white/10 transition group rounded-md relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* # Column */}
      <td className="py-3 px-2 rounded-l-md text-center w-12">
        {isHovered ? (
          <button onClick={handlePlay} className="text-white">
            {isCurrentTrack && isPlaying ? "⏸" : "▶"}
          </button>
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

      {/* Album Column */}
      <td className="py-3 text-neutral-400 hidden md:table-cell">
        {albumName}
      </td>

      {/* Duration Column */}
      <td className="py-3 text-right text-neutral-400 hidden md:table-cell">
        {duration}
      </td>

      {/* Actions Column */}
      <td className="py-3 text-right text-neutral-400 rounded-r-md">
         <div className="flex items-center justify-end gap-2 px-2 relative">
            {/* Like button */}
            <button
              onClick={handleLike}
              disabled={isLiking}
              className={`transition hover:scale-110 ${isLiked ? "text-green-500" : "text-neutral-400 hover:text-white"} ${isLiking ? "animate-pulse" : ""}`}
              title={isLiked ? "Unlike" : "Like"}
            >
              {isLiked ? "❤️" : "🤍"}
            </button>

            {/* Save to playlist button */}
            {!hidePlaylistButton && (
              <button
                onClick={() => setShowPlaylistMenu(!showPlaylistMenu)}
                className="text-neutral-400 hover:text-white transition hover:scale-110"
                title="Save to Playlist"
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

            {/* Download / Save to Cloud button */}
            {isDownloaded ? (
                <span className="text-green-500" title="Saved to Cloud">✔</span>
            ) : (
                <button 
                    onClick={handleDownloadClick}
                    className={`hover:text-white ${isDownloading ? "animate-pulse text-blue-400" : ""}`}
                    title="Save to Cloud"
                    disabled={isDownloading}
                >
                    {isDownloading ? "..." : "⬇"}
                </button>
            )}

            {/* Remove button (for user playlists) */}
            {showRemoveButton && onRemove && (
              <button
                onClick={() => onRemove(track)}
                className="text-neutral-400 hover:text-red-400 transition hover:scale-110"
                title="Remove"
              >
                ✕
              </button>
            )}
         </div>
      </td>
    </tr>
  );
}
