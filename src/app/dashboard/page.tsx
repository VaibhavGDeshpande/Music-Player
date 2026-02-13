"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function DashboardPage() {
  const [playlists, setPlaylists] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/playlists")
      .then((res) => res.json())
      .then((data) => {
        if (data.items) {
          setPlaylists(data.items);
        }
      });
  }, []);

  return (
    <div className="text-white">
      <h1 className="text-3xl font-bold mb-6">Welcome Back</h1>
      
      <h2 className="text-2xl font-bold mb-4">Your Playlists</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {playlists.map((playlist) => (
          <div
            key={playlist.id}
            className="bg-neutral-900 p-4 rounded-md hover:bg-neutral-800 transition cursor-pointer group"
            onClick={() => window.location.href = `/dashboard/playlists/${playlist.id}`}
          >
            <div className="relative mb-4">
              <img
                src={playlist.images?.[0]?.url || "/placeholder.png"}
                alt={playlist.name}
                className="w-full aspect-square object-cover rounded-md shadow-lg"
              />
            </div>
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
