"use client";

import { usePlayer } from "@/contexts/PlayerContext";
import { useState } from "react";

interface SongRowProps {
  track: any;
  index: number;
  onDownload: (track: any) => Promise<void>; 
}

export default function SongRow({ track, index, onDownload }: SongRowProps) {
  const { playTrack, currentTrack, isPlaying, downloadedSongs, refreshLibrary } = usePlayer();
  const [isHovered, setIsHovered] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const isCurrentTrack = currentTrack?.id === track.id;
  const isDownloaded = downloadedSongs.has(track.id);

  const handlePlay = () => {
     if (isDownloaded) {
         // Construct URL immediately without API call
         // (Assuming standard path format: userId/trackId.mp3 - BUT we need userId to be sure. 
         //  Actually, the public URL is deterministic if we know the path. 
         //  Wait, we don't have the userId here easily to construct the path manually 
         //  UNLESS we store full song objects in context or fetched from an endpoint.
         //  For now, let's still hit the endpoint BUT with the expectation it returns 200 OK fast.
         //  Optimized approach: The API call is fast if song exists. 
         //  To make it TRULY offline/cached, we'd need to store the FULL URL in `downloadedSongs` map.)
         
         // Let's rely on the API for the URL for now, but at least we KNOW it's downloaded.
         // To improve, we can change downloadedSongs to Map<string, string> (id -> url) structure later.
         
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
                 title: track.name,
                 artist: track.artists ? track.artists.map((a: any) => a.name).join(", ") : track.artist,
                 cover: track.album?.images?.[0]?.url || track.cover_url,
                 url: publicUrl,
               });
            }
         });
     } else {
         alert("Please 'Download' this song first to save it to your library!");
     }
  };

  const handleDownloadClick = async () => {
      setIsDownloading(true);
      await onDownload(track);
      setIsDownloading(false);
      refreshLibrary(); // Update cache
  };

  return (
    <tr
      className="hover:bg-white/10 transition group rounded-md relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
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
      <td className="py-3">
        <div className="flex items-center gap-4">
          <img
            src={track.album?.images?.[2]?.url || track.cover_url || "/placeholder.png"}
            alt={track.name}
            className="w-10 h-10 rounded-sm object-cover"
          />
          <div>
            <p className={`font-semibold ${isCurrentTrack ? "text-green-500" : "text-white"}`}>
              {track.name}
            </p>
            <p className="text-sm text-neutral-400">
               {track.artists ? track.artists.map((a: any) => a.name).join(", ") : track.artist}
            </p>
          </div>
        </div>
      </td>
      <td className="py-3 text-neutral-400 hidden md:table-cell">
        {track.album?.name || track.album}
      </td>
      <td className="py-3 text-right text-neutral-400 rounded-r-md">
         {/* Actions */}
         <div className="flex items-center justify-end gap-3 px-4">
            {isDownloaded ? (
                <span className="text-green-500" title="Downloaded">✔</span>
            ) : (
                <button 
                    onClick={handleDownloadClick}
                    className={`hover:text-white ${isDownloading ? "animate-pulse text-blue-400" : ""}`}
                    title="Download / Save"
                    disabled={isDownloading}
                >
                    {isDownloading ? "..." : "⬇"}
                </button>
            )}
         </div>
      </td>
    </tr>
  );
}
