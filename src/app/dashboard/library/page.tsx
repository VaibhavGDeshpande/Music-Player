"use client";

import { useEffect, useState, useCallback } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import SongRow from "@/components/SongRow";

export default function LikedSongsPage() {
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { downloadedSongs, refreshLibrary, likedSongs, toggleLikeSong, likedSongsCache, refreshLikedSongsCache } = usePlayer();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch all pages of Spotify liked songs
  const fetchAllSpotifyLiked = useCallback(async (): Promise<any[]> => {
    const allTracks: any[] = [];
    let offset = 0;
    const limit = 50;
    let total = Infinity;

    while (offset < total) {
      try {
        const res = await fetch(`/api/liked-songs?offset=${offset}&limit=${limit}`);
        if (!res.ok) break;
        const data = await res.json();
        total = data.total || 0;

        if (data.items) {
          for (const item of data.items) {
            const t = item.track || item.item;
            if (t) {
              allTracks.push({
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

        offset += limit;
        // Stop if no more pages
        if (!data.next) break;
      } catch {
        break;
      }
    }

    return allTracks;
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        // Use cached local liked songs if available, otherwise fetch
        const localSongsPromise = likedSongsCache !== null
          ? Promise.resolve(likedSongsCache)
          : refreshLikedSongsCache();

        const [spotifyTracks, localSongs] = await Promise.all([
          fetchAllSpotifyLiked(),
          localSongsPromise,
        ]);

        // Normalize local DB tracks
        const localTracks: any[] = [];
        if (localSongs && localSongs.length > 0) {
          for (const s of localSongs) {
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
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [fetchAllSpotifyLiked, likedSongsCache, refreshLikedSongsCache]);

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
          {loading ? "Loading..." : `${tracks.length} songs`}
        </p>
      </div>
    </div>

    {loading ? (
      <div className="text-neutral-400 text-center py-10">Loading your liked songs...</div>
    ) : (
      <>
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
                    allTracks={tracks}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* MOBILE LIST */}
        <div className="md:hidden bg-black/20 p-3 rounded-md">
          <table className="w-full text-left text-neutral-400 text-sm">
            <tbody>
              {tracks.map((track, index) => (
                <SongRow
                  key={track.id + index}
                  track={track}
                  index={index}
                  onDownload={handleDownload}
                    allTracks={tracks}
                />
              ))}
            </tbody>
          </table>
        </div>
      </>
    )}

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