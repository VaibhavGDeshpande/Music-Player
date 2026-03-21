"use client";

import { useEffect, useState, use } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import SongRow from "@/components/SongRow";

export default function SectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { downloadedSongs, refreshLibrary } = usePlayer();
  
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const title = id === "recent" ? "Recently Played" : id === "recs" ? "Made For You" : "Playlist";

  useEffect(() => {
    if (id === "recent") {
      fetch("/api/recently-played")
        .then((res) => res.json())
        .then((data) => {
          if (data.items) {
            const seen = new Set<string>();
            const unique = data.items.filter((item: any) => {
              if (seen.has(item.track.id)) return false;
              seen.add(item.track.id);
              return true;
            }).map((item: any) => item.track);
            setTracks(unique.slice(0, 50));
          }
        })
        .finally(() => setLoading(false));
    } else if (id === "recs") {
      fetch("/api/recs")
        .then((res) => res.json())
        .then((data) => {
          if (data.tracks) setTracks(data.tracks.slice(0, 50));
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
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
        showToast(`Failed: ${err.error || "Unknown error"}`, "error");
      }
    } catch {
      showToast("Error saving song.", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full pt-20">
        <div className="w-10 h-10 border-3 border-neutral-600 border-t-green-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="text-white pb-32 px-4 md:px-8 pt-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-5xl font-bold mb-3">{title}</h1>
        <p className="text-sm text-neutral-400">{tracks.length} songs</p>
      </div>

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
              {tracks.map((track: any, index: number) => (
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

        {/* Mobile List */}
        <div className="md:hidden bg-black/20 p-3 rounded-md">
          <table className="w-full text-left text-neutral-400 text-sm">
            <tbody>
              {tracks.map((track: any, index: number) => (
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

      {toast && (
        <div
          className={`fixed bottom-24 right-5 px-5 py-3 rounded-lg shadow-2xl text-white font-medium z-50 flex items-center gap-2 animate-slide-up ${
            toast.type === "success"
              ? "bg-green-600/90"
              : toast.type === "error"
              ? "bg-red-600/90"
              : "bg-blue-600/90"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
