"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import SongRow from "@/components/SongRow";

export default function PlaylistDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const [playlist, setPlaylist] = useState<any>(null);
  const [showOptions, setShowOptions] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/playlists/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          console.error("Failed to load playlist:", data.error);
          setPlaylist({ error: data.error });
        } else {
          setPlaylist(data);
        }
      })
      .catch(err => {
        console.error("Network error:", err);
        setPlaylist({ error: "Failed to connect to server" });
      });
  }, [id]);

  if (!playlist) return <div className="text-white p-10">Loading...</div>;
  if (playlist.error) return <div className="text-red-500 p-10">Error: {JSON.stringify(playlist.error)}</div>;

  // Spotify API returns songs under "items" (not "tracks"), and each song is under "item" (not "track")
  const tracksData = playlist.tracks || playlist.items;
  const trackItems = tracksData?.items || [];
  const totalSongs = tracksData?.total || trackItems.length || 0;

  const handleDownload = async (track: any) => {
    setShowOptions(null);
    const toastId = `download-${track.id}`;

    const startMsg = document.createElement("div");
    startMsg.innerText = `Downloading ${track.name}...`;
    startMsg.className = "fixed bottom-5 right-5 bg-blue-600 text-white p-4 rounded-md z-50 animate-bounce";
    startMsg.id = toastId;
    document.body.appendChild(startMsg);

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
      document.body.removeChild(startMsg);

      if (data.success || data.message === "Song already downloaded") {
        const successMsg = document.createElement("div");
        successMsg.innerText = `Downloaded ${track.name}!`;
        successMsg.className = "fixed bottom-5 right-5 bg-green-600 text-white p-4 rounded-md z-50";
        document.body.appendChild(successMsg);
        setTimeout(() => document.body.removeChild(successMsg), 3000);
      } else {
        alert("Download failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      document.body.removeChild(startMsg);
      alert("Error downloading song");
      console.error(err);
    }
  };

  return (
    <div className="text-white relative pb-32 px-4 md:px-6 pt-6">
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-8">
        <img
          src={playlist.images?.[0]?.url || "/placeholder.svg"}
          alt={playlist.name}
          className="w-36 h-36 md:w-52 md:h-52 shadow-2xl rounded-md"
        />
        <div className="text-center md:text-left">
          <p className="text-xs md:text-sm font-bold uppercase mb-2">Playlist</p>
          <h1 className="text-3xl md:text-7xl font-bold mb-3">{playlist.name}</h1>
          <p className="text-neutral-400 text-sm md:text-base">{playlist.description}</p>
          <div className="mt-2 flex items-center justify-center md:justify-start gap-1 text-sm font-semibold">
            <span>{playlist.owner?.display_name || "Unknown"}</span>
            <span className="w-1 h-1 bg-white rounded-full mx-1"></span>
            <span>{totalSongs} songs</span>
          </div>
        </div>
      </div>

      <div className="bg-black/20 p-3 md:p-6 rounded-md">
        <table className="w-full text-left text-neutral-400">
          <thead>
            <tr className="border-b border-neutral-700 text-sm uppercase">
              <th className="pb-3 w-12 text-center">#</th>
              <th className="pb-3">Title</th>
              <th className="pb-3 hidden md:table-cell">Album</th>
              <th className="pb-3 text-right hidden md:table-cell">Duration</th>
              <th className="pb-3 w-12 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {trackItems.map((item: any, index: number) => {
              // Spotify API uses "item" in newer responses, "track" in older ones
              const track = item.track || item.item;
              if (!track) return null;

              return (
                <SongRow 
                    key={track.id + index} 
                    track={track} 
                    index={index} 
                    onDownload={handleDownload}
                    allTracks={trackItems.map((item: any) => item.track || item.item).filter(Boolean)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
