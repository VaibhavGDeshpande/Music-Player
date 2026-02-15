"use client";

import { useState } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import SongRow from "@/components/SongRow";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);
  const { downloadedSongs, refreshLibrary } = usePlayer();

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setResults(data);
  };

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

  return (
    <div className="text-white">
      <form onSubmit={handleSearch} className="mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What do you want to listen to?"
          className="w-full bg-neutral-800 text-white p-4 rounded-full focus:outline-none focus:ring-2 focus:ring-white placeholder-neutral-500"
        />
      </form>

      {results && (
        <div className="space-y-8">
          {results.tracks?.items.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-4">Songs</h2>
              <div className="bg-black/20 p-4 md:p-6 rounded-md">
                <table className="w-full text-left text-neutral-400 text-sm">
                  <thead className="border-b border-neutral-700 uppercase text-xs tracking-wider">
                    <tr>
                      <th className="pb-3 w-12 text-center">#</th>
                      <th className="pb-3">Title</th>
                      <th className="pb-3 hidden md:table-cell">Album</th>
                      <th className="pb-3 text-right hidden md:table-cell">Duration</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.tracks.items.slice(0, 5).map((track: any, index: number) => (
                      <SongRow
                        key={track.id}
                        track={track}
                        index={index}
                        onDownload={handleDownload}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {results.artists?.items.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-4">Artists</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {results.artists.items.slice(0, 4).map((artist: any) => (
                  <div
                    key={artist.id}
                    className="bg-neutral-900 p-4 rounded-md hover:bg-neutral-800 transition cursor-pointer group text-center"
                  >
                    <div className="relative mb-4">
                      <img
                        src={artist.images[0]?.url || "/placeholder.png"}
                        alt={artist.name}
                        className="w-32 h-32 rounded-full mx-auto object-cover shadow-lg"
                      />
                    </div>
                    <h3 className="font-bold truncate">{artist.name}</h3>
                    <p className="text-sm text-neutral-400">Artist</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {results.albums?.items.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-4">Albums</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {results.albums.items.slice(0, 4).map((album: any) => (
                  <div
                    key={album.id}
                    className="bg-neutral-900 p-4 rounded-md hover:bg-neutral-800 transition cursor-pointer group"
                  >
                    <div className="relative mb-4">
                      <img
                        src={album.images[0]?.url || "/placeholder.png"}
                        alt={album.name}
                        className="w-full aspect-square object-cover rounded-md shadow-lg"
                      />
                    </div>
                    <h3 className="font-bold truncate">{album.name}</h3>
                    <p className="text-sm text-neutral-400 truncate">
                      {album.artists.map((a: any) => a.name).join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
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