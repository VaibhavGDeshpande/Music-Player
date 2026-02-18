"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { usePlayer } from "@/contexts/PlayerContext";
import SongRow from "@/components/SongRow";

export default function ArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [artist, setArtist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { downloadedSongs, refreshLibrary } = usePlayer();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchArtist = async () => {
      try {
        const res = await fetch(`/api/artist/${id}`);
        const data = await res.json();
        if (res.ok) {
          setArtist(data);
        } else {
          console.error("Failed to fetch artist:", data);
        }
      } catch (err) {
        console.error("Error fetching artist:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchArtist();
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
    } catch (e) {
      console.error(e);
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

  if (!artist) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-white">
        <h2 className="text-xl font-semibold mb-2">Artist not found</h2>
      </div>
    );
  }

  return (
    <div className="text-white pb-32 px-4 md:px-8 pt-8">
      {/* Artist Header */}
      <div className="flex flex-col md:flex-row items-end gap-6 mb-12">
        <img
          src={artist.images?.[0]?.url || "/placeholder.svg"}
          alt={artist.name}
          className="w-52 h-52 shadow-2xl rounded-full object-cover"
        />
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-blue-400 text-2xl font-bold">✓</span>
            <span className="text-sm font-bold uppercase hidden md:block">Verified Artist</span>
          </div>
          <h1 className="text-4xl md:text-8xl font-bold mb-4">{artist.name}</h1>
          <div className="text-neutral-300">
            {artist.followers?.total?.toLocaleString()} followers
          </div>
        </div>
      </div>

      {/* Top Tracks */}
      <section>
        <h2 className="text-2xl font-bold mb-6">Popular</h2>
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
              {artist.top_tracks?.map((track: any, index: number) => (
                <SongRow
                  key={track.id}
                  track={track}
                  index={index}
                  onDownload={handleDownload}
                  allTracks={artist.top_tracks}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Albums Section */}
      {artist.albums && artist.albums.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Albums</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {artist.albums.map((album: any) => (
              <div
                key={album.id}
                className="bg-neutral-900/50 hover:bg-neutral-800/70 p-4 rounded-xl transition-all cursor-pointer group"
                onClick={() => router.push(`/dashboard/album/${album.id}`)}
              >
                <div className="relative mb-3">
                  <img
                    src={album.images?.[0]?.url || "/placeholder.svg"}
                    alt={album.name}
                    className="w-full aspect-square object-cover rounded-lg shadow-lg"
                  />
                  {/* Hover play button */}
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition">
                      <span className="text-black text-sm ml-0.5">▶</span>
                    </div>
                  </div>
                </div>
                <h3 className="font-bold text-sm truncate">{album.name}</h3>
                <p className="text-xs text-neutral-500 truncate mt-1">
                  {album.release_date?.split("-")[0]} • {album.type}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

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
