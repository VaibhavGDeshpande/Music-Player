"use client";

import { useState } from "react";
import { usePlayer } from "@/contexts/PlayerContext";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { playTrack, downloadedSongs, refreshLibrary } = usePlayer();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setResults(data);
  };

  // ✅ PLAY LOGIC
  const handlePlay = (track: any) => {
    if (downloadedSongs.has(track.id)) {
      // Play full song from DB
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
              artist: track.artists.map((a: any) => a.name).join(", "),
              cover: track.album.images[0]?.url,
              url: publicUrl,
              duration: track.duration_ms / 1000,
            });
          }
      })
      .catch(err => console.error("Error playing full song:", err));
    } else if (track.preview_url) {
      playTrack({
        id: track.id,
        title: track.name,
        artist: track.artists.map((a: any) => a.name).join(", "),
        cover: track.album.images[0]?.url,
        url: track.preview_url,
      });
    } else {
      alert("No preview available. Please Save to Cloud!");
    }
  };


  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async (track: any) => {
    if (downloadedSongs.has(track.id)) return;

    setDownloadingId(track.id);
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
    } finally {
      setDownloadingId(null);
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
              <div className="space-y-2">
                {results.tracks.items.slice(0, 5).map((track: any) => {
                  const isDownloaded = downloadedSongs.has(track.id);
                  const isSaving = downloadingId === track.id;

                  return (
                    <div
                      key={track.id}
                      onClick={() => handlePlay(track)}
                      className="flex items-center gap-4 hover:bg-white/10 p-2 rounded-md transition group cursor-pointer"
                    >
                      <img
                        src={track.album.images[2]?.url}
                        alt={track.name}
                        className="w-12 h-12 rounded-sm"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-white">{track.name}</p>
                        <p className="text-sm text-neutral-400">
                          {track.artists.map((a: any) => a.name).join(", ")}
                        </p>
                      </div>

                      {/* Save Button */}
                      {!isDownloaded && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSave(track);
                          }}
                          disabled={isSaving}
                          className="text-neutral-400 hover:text-white mr-3"
                        >
                          {isSaving ? "..." : "⬇"}
                        </button>
                      )}

                      {isDownloaded && (
                        <span className="text-green-500 mr-3">Saved</span>
                      )}

                      <div className="opacity-0 group-hover:opacity-100 text-neutral-400">
                        {Math.floor(track.duration_ms / 60000)}:
                        {((track.duration_ms % 60000) / 1000)
                          .toFixed(0)
                          .padStart(2, "0")}
                      </div>
                    </div>
                  );
                })}
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
          className={`fixed bottom-5 right-5 px-6 py-3 rounded-md shadow-lg text-white font-medium transition-all transform translate-y-0 opacity-100 z-50 ${
            toast.type === "success" ? "bg-green-600" : toast.type === "error" ? "bg-red-600" : "bg-blue-600"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}