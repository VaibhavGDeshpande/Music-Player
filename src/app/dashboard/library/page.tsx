"use client";

import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [playlists, setPlaylists] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/playlists")
      .then((res) => res.json())
      .then((data) => {
        if (data.items) setPlaylists(data.items);
      });
  }, []);

  return (
    <div className="text-white px-4 md:px-8 pb-32 md:ml-64">

      <h1 className="text-2xl md:text-3xl font-bold mb-6">
        Welcome Back
      </h1>

      <h2 className="text-xl md:text-2xl font-bold mb-4">
        Your Playlists
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {playlists.map((playlist) => (
          <div
            key={playlist.id}
            onClick={() =>
              (window.location.href = `/dashboard/playlists/${playlist.id}`)
            }
            className="bg-neutral-900 p-4 rounded-md hover:bg-neutral-800 transition cursor-pointer"
          >
            <img
              src={playlist.images?.[0]?.url || "/placeholder.png"}
              className="w-full aspect-square object-cover rounded-md mb-3"
            />

            <h3 className="font-bold truncate">{playlist.name}</h3>
            <p className="text-sm text-neutral-400 truncate">
              By {playlist.owner.display_name}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}