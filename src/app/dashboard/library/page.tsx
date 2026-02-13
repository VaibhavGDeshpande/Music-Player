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
      });
  }, []);

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
                <td className="py-3 text-right rounded-r-md">
                  {Math.floor(track.duration_ms / 60000)}:
                  {((track.duration_ms % 60000) / 1000).toFixed(0).padStart(2, "0")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
