"use client";

import { useEffect, useState } from "react";

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
          const event = new CustomEvent("play_track", {
            detail: {
              url: publicUrl,
              title: track.name,
              artist: track.artists.map((a: any) => a.name).join(", "),
              cover: track.album.images[0]?.url,
            },
          });
          window.dispatchEvent(event);
       } else {
         alert("Please download this song first!");
       }
    })
    .catch(err => console.error("Play error", err));
  };

  return (
    <div className="text-white">
      <div className="flex items-end gap-6 mb-8">
        <div className="w-52 h-52 bg-gradient-to-br from-indigo-700 to-green-300 flex items-center justify-center shadow-2xl rounded-md">
          <span className="text-6xl">❤️</span>
        </div>
        <div>
          <p className="text-sm font-bold uppercase mb-2">Playlist</p>
          <h1 className="text-7xl font-bold mb-4">Liked Songs</h1>
          <p className="text-sm text-neutral-400">
            {tracks.length} songs
          </p>
        </div>
      </div>

      <div className="bg-black/20 p-6 rounded-md">
        <table className="w-full text-left text-neutral-400">
          <thead>
            <tr className="border-b border-neutral-700 text-sm uppercase">
              <th className="pb-3 w-12">#</th>
              <th className="pb-3">Title</th>
              <th className="pb-3">Album</th>
              <th className="pb-3 text-right">Duration</th>
              <th className="pb-3 w-12 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tracks.map((track, index) => (
              <tr
                key={track.id}
                className="hover:bg-white/10 transition group rounded-md"
              >
                <td className="py-3 px-2 rounded-l-md">{index + 1}</td>
                <td className="py-3">
                  <div className="flex items-center gap-4">
                    <img
                      src={track.album.images[2]?.url}
                      alt={track.name}
                      className="w-10 h-10 rounded-sm"
                    />
                    <div>
                      <p className="text-white font-semibold">{track.name}</p>
                      <p className="text-sm">{track.artists.map((a: any) => a.name).join(", ")}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3">{track.album.name}</td>
                <td className="py-3 text-right">
                  {Math.floor(track.duration_ms / 60000)}:
                  {((track.duration_ms % 60000) / 1000).toFixed(0).padStart(2, "0")}
                </td>
                <td className="py-3 px-2 rounded-r-md text-right relative">
                   <div className="flex items-center justify-end gap-2">
                      <button
                        className="p-2 hover:text-green-400"
                        title="Play (if downloaded)"
                        onClick={() => handlePlayDownload(track)}
                      >
                        ▶
                      </button>
                      <button
                        className="p-2 hover:text-blue-400"
                        title="Download"
                        onClick={() => handleDownload(track)}
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
    </div>
  );
}
