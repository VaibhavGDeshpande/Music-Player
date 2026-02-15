"use client";

import { useEffect, useState } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import SongRow from "@/components/SongRow";

export default function LikedSongsPage() {
  const [tracks, setTracks] = useState<any[]>([]);
  const { downloadedSongs, refreshLibrary, likedSongs, toggleLikeSong } = usePlayer();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [spotifyRes, localRes] = await Promise.all([
          fetch("/api/liked-songs").then((r) => r.json()).catch(() => null),
          fetch("/api/user-liked-songs").then((r) => r.json()).catch(() => null),
        ]);

        // Normalize Spotify tracks
        const spotifyTracks: any[] = [];
        if (spotifyRes?.items) {
          for (const item of spotifyRes.items) {
            const t = item.track || item.item;
            if (t) {
              spotifyTracks.push({
                id: t.id,
                name: t.name,
                artists: t.artists,
                album: t.album,
                duration_ms: t.duration_ms,
                external_urls: t.external_urls,
                preview_url: t.preview_url,
                source: "spotify",
              });
            }
          }
        }

        // Normalize local DB tracks
        const localTracks: any[] = [];
        if (localRes?.songs) {
          for (const s of localRes.songs) {
            localTracks.push({
              id: s.spotify_id,
              name: s.title,
              artists: [{ name: s.artist }],
              album: { name: s.album || "Unknown", images: [{ url: s.cover_url }, { url: s.cover_url }, { url: s.cover_url }] },
              duration_ms: s.duration_ms || 0,
              storage_path: s.storage_path,
              cover_url: s.cover_url,
              external_urls: { spotify: `https://open.spotify.com/track/${s.spotify_id}` },
              source: "local",
            });
          }
        }

        // Merge: local first (they have storage_path), then Spotify-only
        const seenIds = new Set<string>();
        const merged: any[] = [];

        for (const t of localTracks) {
          seenIds.add(t.id);
          const spotifyMatch = spotifyTracks.find((s) => s.id === t.id);
          if (spotifyMatch) {
            merged.push({ ...spotifyMatch, storage_path: t.storage_path, source: "both" });
          } else {
            merged.push(t);
          }
        }

        for (const t of spotifyTracks) {
          if (!seenIds.has(t.id)) {
            seenIds.add(t.id);
            merged.push(t);
          }
        }

        setTracks(merged);
      } catch (err) {
        console.error("Error fetching liked songs:", err);
      }
    };

    fetchAll();
  }, []);

  const handleDownload = async (track: any) => {
    if (downloadedSongs.has(track.id)) return;

    showToast(`Downloading "${track.name}"...`, "info");

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackId: track.id,
          spotifyUrl: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
        }),
      });

      const data = await res.json();

      if (data.success || data.message === "Song already downloaded") {
        refreshLibrary();
        showToast(`Saved "${track.name}" to Cloud!`, "success");
      } else {
        showToast(`Download failed: ${data.error || "Unknown error"}`, "error");
      }
    } catch (err) {
      showToast("Error downloading song", "error");
      console.error(err);
    }
  };

  return (
  <div className="text-white px-4 md:px-8 pb-32">

    {/* HEADER */}
    <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-10 text-center md:text-left pt-6">
      <div className="w-40 h-40 md:w-52 md:h-52 bg-gradient-to-br from-indigo-700 to-green-300 flex items-center justify-center shadow-2xl rounded-md">
        <span className="text-5xl md:text-6xl">❤️</span>
      </div>

      <div>
        <p className="text-xs md:text-sm font-bold uppercase mb-2">
          Playlist
        </p>
        <h1 className="text-3xl md:text-6xl font-bold mb-3">
          Liked Songs
        </h1>
        <p className="text-sm text-neutral-400">
          {tracks.length} songs
        </p>
      </div>
    </div>

    {/* DESKTOP TABLE */}
    <div className="hidden md:block bg-black/20 p-6 rounded-md overflow-hidden">
      <table className="w-full text-left text-neutral-400 text-sm">
        <thead className="border-b border-neutral-700 uppercase text-xs tracking-wider">
          <tr>
            <th className="pb-3 w-12 text-center">#</th>
            <th className="pb-3">Title</th>
            <th className="pb-3">Album</th>
            <th className="pb-3 text-right">Duration</th>
            <th className="pb-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tracks.map((track, index) => (
            <SongRow
              key={track.id + index}
              track={track}
              index={index}
              onDownload={handleDownload}
            />
          ))}
        </tbody>
      </table>
    </div>

    {/* MOBILE LIST */}
    <div className="md:hidden space-y-3">
      {tracks.map((track, index) => (
        <SongRow
          key={track.id + index}
          track={track}
          index={index}
          onDownload={handleDownload}
        />
      ))}
    </div>

    {/* Toast Notification */}
    {toast && (
      <div
        className={`fixed bottom-5 right-5 px-6 py-3 rounded-md shadow-lg text-white font-medium transition-all z-50 ${
          toast.type === "success" ? "bg-green-600" : toast.type === "error" ? "bg-red-600" : "bg-blue-600"
        }`}
      >
        {toast.message}
      </div>
    )}
  </div>
);
}