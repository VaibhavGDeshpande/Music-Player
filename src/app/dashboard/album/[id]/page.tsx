"use client";

import { useEffect, useState, use } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import SongRow from "@/components/SongRow";

export default function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap params using React.use()
  const { id } = use(params);

  const [album, setAlbum] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { downloadedSongs, refreshLibrary } = usePlayer();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchAlbum = async () => {
      try {
        const res = await fetch(`/api/album/${id}`);
        const data = await res.json();
        if (res.ok) {
          setAlbum(data);
        } else {
        }
      } catch {
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchAlbum();
    }
  }, [id]);

  const handleDownload = async (track: any) => {
    if (downloadedSongs.has(track.id)) return;

    showToast(`Downloading "${track.name}"...`, "info");

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackId: track.id,
          spotifyUrl: track.external_urls?.spotify,
        }),
      });

      if (res.ok) {
        refreshLibrary();
        showToast(`Saved "${track.name}" to Cloud!`, "success");
      } else {
        const err = await res.json();
        showToast(`Failed to save: ${err.error || "Unknown error"}`, "error");
      }
    } catch {
      showToast("Error saving song.", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="w-10 h-10 border-3 border-neutral-600 border-t-green-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-white">
        <h2 className="text-xl font-semibold mb-2">Album not found</h2>
      </div>
    );
  }

  return (
    <div className="text-white pb-32 px-4 md:px-8 pt-8">
      {/* Album Header */}
      <div className="flex flex-col md:flex-row items-end gap-6 mb-8">
        <img
          src={album.images?.[0]?.url || "/placeholder.svg"}
          alt={album.name}
          className="w-52 h-52 shadow-2xl rounded-lg object-cover"
        />
        <div className="flex flex-col gap-2">
          <span className="text-sm font-bold uppercase hidden md:block">Album</span>
          <h1 className="text-4xl md:text-7xl font-bold">{album.name}</h1>
          <div className="flex items-center gap-2 text-sm font-medium mt-4 text-neutral-300">
            <span className="text-white">{album.artists?.map((a: any) => a.name).join(", ")}</span>
            <span>•</span>
            <span>{album.release_date?.split("-")[0]}</span>
            <span>•</span>
            <span>{album.total_tracks} songs</span>
          </div>
        </div>
      </div>

      {/* Tracks List */}
      <div className="bg-black/20 rounded-xl overflow-hidden">
        <table className="w-full text-left text-neutral-400 text-sm">
          <thead className="border-b border-neutral-800 text-neutral-400">
            <tr>
              <th className="px-4 py-2 font-light w-12 text-center">#</th>
              <th className="px-4 py-2 font-light">Title</th>
              <th className="px-4 py-2 font-light hidden md:table-cell">Plays</th>
              <th className="px-4 py-2 font-light hidden md:table-cell text-right"><span className="sr-only">Duration</span>🕒</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {album.tracks?.items?.map((track: any, index: number) => (
              <SongRow
                key={track.id}
                track={{...track, album: { images: album.images }}} // Inject album images as tracks in album endpoint might miss it
                index={index}
                onDownload={handleDownload}
                allTracks={album.tracks.items.map((t: any) => ({...t, album: { images: album.images }}))}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-24 right-5 px-5 py-3 rounded-lg shadow-2xl text-white font-medium z-50 flex items-center gap-2 animate-slide-up ${
            toast.type === "success"
              ? "bg-green-600/90 backdrop-blur-sm"
              : toast.type === "error"
              ? "bg-red-600/90 backdrop-blur-sm"
              : "bg-blue-600/90 backdrop-blur-sm"
          }`}
        >
          <span>
            {toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "💾"}
          </span>
          {toast.message}
        </div>
      )}
    </div>
  );
}
