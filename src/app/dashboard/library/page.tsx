"use client";

import { useEffect, useState } from "react";
import { usePlayer } from "@/contexts/PlayerContext";

export default function LikedSongsPage() {
  const [tracks, setTracks] = useState<any[]>([]);

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

  const { playTrack } = usePlayer();

  const handleDownload = async (track: any) => {
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

  const handlePlayDownload = (track: any) => {
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
       } else {
         alert("Please download this song first!");
       }
    })
    .catch(err => console.error("Play error", err));
  };

return (
  <div className="text-white px-4 md:px-8 pb-32">

    {/* HEADER */}
    <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-10 text-center md:text-left">
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
          {tracks.map((track, index) => (
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
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => handlePlayDownload(track)}
                    className="hover:text-green-400"
                  >
                    ▶
                  </button>
                  <button
                    onClick={() => handleDownload(track)}
                    className="hover:text-blue-400"
                  >
                    ⬇
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* MOBILE CARD LIST */}
    <div className="md:hidden space-y-3">
      {tracks.map((track) => (
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

          <div className="flex gap-3">
            <button
              onClick={() => handlePlayDownload(track)}
              className="text-green-400 text-lg"
            >
              ▶
            </button>
            <button
              onClick={() => handleDownload(track)}
              className="text-blue-400 text-lg"
            >
              ⬇
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);
}