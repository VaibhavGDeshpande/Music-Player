"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { usePlayer } from "@/contexts/PlayerContext";
import SongRow from "@/components/SongRow";

export default function MyPlaylistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const { playTrack, downloadedSongs, refreshLibrary } = usePlayer();
  const [playlist, setPlaylist] = useState<any>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetch(`/api/user-playlists/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.playlist) {
          setPlaylist(data.playlist);
          setSongs(data.songs || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleRemove = async (track: any) => {
    const spotifyId = track.id || track.spotify_id;
    try {
      await fetch(`/api/user-playlists/${id}/songs`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spotify_id: spotifyId }),
      });
      setSongs((prev) => prev.filter((s) => s.spotify_id !== spotifyId));
      showToast(`Removed "${track.name || track.title}" from playlist`, "success");
    } catch (err) {
      console.error("Failed to remove song:", err);
      showToast("Failed to remove song", "error");
    }
  };

  const handleDownload = async (track: any) => {
    const trackId = track.id || track.spotify_id;
    showToast(`Downloading "${track.name || track.title}"...`, "info");

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackId: trackId,
          spotifyUrl: track.external_urls?.spotify || `https://open.spotify.com/track/${trackId}`,
        }),
      });

      const data = await res.json();

      if (data.success || data.message === "Song already downloaded") {
        refreshLibrary();
        showToast(`Saved "${track.name || track.title}" to Cloud!`, "success");
      } else {
        showToast(`Download failed: ${data.error || "Unknown error"}`, "error");
      }
    } catch (err) {
      showToast("Error downloading song", "error");
      console.error(err);
    }
  };

  if (loading) return <div className="text-white p-10">Loading...</div>;
  if (!playlist) return <div className="text-red-500 p-10">Playlist not found</div>;

  // Normalize local DB songs to SongRow-compatible format
  const normalizedSongs = songs.map((s) => ({
    id: s.spotify_id,
    name: s.title,
    artists: [{ name: s.artist }],
    album: { name: s.album || "Unknown", images: [{ url: s.cover_url }, { url: s.cover_url }, { url: s.cover_url }] },
    duration_ms: s.duration_ms || 0,
    cover_url: s.cover_url,
    storage_path: s.storage_path,
    external_urls: { spotify: `https://open.spotify.com/track/${s.spotify_id}` },
  }));

  return (
    <div className="text-white px-4 md:px-8 pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-10 pt-6">
        <div className="w-40 h-40 md:w-52 md:h-52 bg-gradient-to-br from-indigo-600 to-purple-500 flex items-center justify-center shadow-2xl rounded-md">
          <span className="text-5xl md:text-6xl">🎵</span>
        </div>
        <div className="text-center md:text-left">
          <p className="text-xs md:text-sm font-bold uppercase mb-2">Playlist</p>
          <h1 className="text-3xl md:text-6xl font-bold mb-3">{playlist.name}</h1>
          {playlist.description && (
            <p className="text-neutral-400 mb-2">{playlist.description}</p>
          )}
          <p className="text-sm text-neutral-400">{songs.length} songs</p>
        </div>
      </div>

      {/* Songs Table */}
      {songs.length === 0 ? (
        <div className="text-neutral-400 text-center py-16">
          <p className="text-4xl mb-4">🎶</p>
          <p>No songs in this playlist yet.</p>
          <p className="text-sm mt-1">
            Go to any playlist or search results and click ➕ to add songs!
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-black/20 p-6 rounded-md">
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
                {normalizedSongs.map((track, index) => (
                  <SongRow
                    key={track.id + index}
                    track={track}
                    index={index}
                    onDownload={handleDownload}
                    onRemove={handleRemove}
                    showRemoveButton={true}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile List */}
          <div className="md:hidden space-y-3">
            {normalizedSongs.map((track, index) => (
              <SongRow
                key={track.id + index}
                track={track}
                index={index}
                onDownload={handleDownload}
                onRemove={handleRemove}
                showRemoveButton={true}
              />
            ))}
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
