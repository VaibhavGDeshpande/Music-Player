"use client";

import { useEffect, useState } from "react";
import { usePlayer } from "@/contexts/PlayerContext";

export default function LikedSongsPage() {
  const [tracks, setTracks] = useState<any[]>([]);
  const { playTrack, downloadedSongs, refreshLibrary } = usePlayer();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/liked-songs")
      .then((res) => res.json())
      .then((data) => {
        if (data.items) {
          setTracks(data.items.map((item: any) => item.track));
        }
      })
      .catch(err => console.error("Liked songs fetch error:", err));
  }, []);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDownload = async (track: any) => {
    if (downloadedSongs.has(track.id)) return;
    
    setDownloadingId(track.id);
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
        const err = data.error || "Unknown error";
        showToast(`Download failed: ${err}`, "error");
      }
    } catch (err) {
      showToast("Error downloading song", "error");
      console.error(err);
    } finally {
        setDownloadingId(null);
    }
  };

  const handlePlayDownload = (track: any) => {
    // If downloaded, playing generic way (via API or constructed URL if we cached it).
    // The previous code fetched /api/download just to get the path. 
    // We can do that or play preview if not downloaded.
    
    if (downloadedSongs.has(track.id)) {
        // Fetch DB data to get path, or rely on naming convention if we want to be risky? 
        // Safer to fetch metadata.
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
        });
    } else if (track.preview_url) {
        playTrack({
            id: track.id,
            title: track.name,
            artist: track.artists.map((a: any) => a.name).join(", "),
            cover: track.album.images[0]?.url,
            url: track.preview_url,
            duration: 30, // Preview is 30s
        });
    } else {
         alert("No preview available. Please Save to Cloud!");
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
            <th className="pb-3 w-12">#</th>
            <th className="pb-3">Title</th>
            <th className="pb-3">Album</th>
            <th className="pb-3 text-right">Duration</th>
            <th className="pb-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tracks.map((track, index) => {
            const isDownloaded = downloadedSongs.has(track.id);
            const isSaving = downloadingId === track.id;
            
            return (
            <tr
              key={track.id}
              className="hover:bg-white/10 transition group"
            >
              <td className="py-3">{index + 1}</td>

              <td className="py-3">
                <div className="flex items-center gap-4">
                  <img
                    src={track.album.images[2]?.url}
                    className="w-10 h-10 rounded-sm"
                  />
                  <div>
                    <p className="text-white font-medium">
                      {track.name}
                    </p>
                    <p className="text-xs">
                      {track.artists.map((a: any) => a.name).join(", ")}
                    </p>
                  </div>
                </div>
              </td>

              <td className="py-3 text-neutral-300">
                {track.album.name}
              </td>

              <td className="py-3 text-right">
                {Math.floor(track.duration_ms / 60000)}:
                {((track.duration_ms % 60000) / 1000)
                  .toFixed(0)
                  .padStart(2, "0")}
              </td>

              <td className="py-3 text-right">
                <div className="flex justify-end gap-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
                  <button
                    onClick={() => handlePlayDownload(track)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-green-500 text-black hover:scale-105"
                    title={isDownloaded ? "Play" : "Play Preview"}
                  >
                    ▶
                  </button>
                  
                  {!isDownloaded && (
                      <button
                        onClick={() => handleDownload(track)}
                        disabled={isSaving}
                        className={`w-8 h-8 flex items-center justify-center rounded-full border border-neutral-400 hover:border-white hover:bg-white/10 ${isSaving ? "animate-pulse" : ""}`}
                        title="Save to Cloud"
                      >
                       {isSaving ? "..." : "⬇"}
                      </button>
                  )}
                  
                  {isDownloaded && <span className="text-green-500 text-xl self-center">✔</span>}
                </div>
              </td>
            </tr>
          );
          })}
        </tbody>
      </table>
    </div>

    {/* MOBILE CARD LIST */}
    <div className="md:hidden space-y-3">
      {tracks.map((track) => {
         const isDownloaded = downloadedSongs.has(track.id);
         const isSaving = downloadingId === track.id;

         return (
        <div
          key={track.id}
          className="flex items-center justify-between bg-black/30 p-3 rounded-md"
        >
          <div className="flex items-center gap-3">
            <img
              src={track.album.images[2]?.url}
              className="w-12 h-12 rounded-sm"
            />
            <div className="max-w-[160px]">
              <p className="text-white font-medium truncate">
                {track.name}
              </p>
              <p className="text-xs text-neutral-400 truncate">
                {track.artists.map((a: any) => a.name).join(", ")}
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-center">
            <button
              onClick={() => handlePlayDownload(track)}
              className="text-green-400 text-2xl"
            >
              ▶
            </button>
            
            {!isDownloaded && (
                <button
                  onClick={() => handleDownload(track)}
                  disabled={isSaving}
                  className="text-blue-400 text-2xl"
                >
                  {isSaving ? "..." : "⬇"}
                </button>
            )}
            
            {isDownloaded && <span className="text-green-500">✔</span>}
          </div>
        </div>
      );
      })}
    </div>
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