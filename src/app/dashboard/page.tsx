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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="text-white pb-32">
      {/* Hero / Greeting Section */}
      <div className="bg-gradient-to-b from-green-900/50 to-black p-8 rounded-b-xl mb-6 pt-8">
        <h1 className="text-4xl font-bold">{getGreeting()}</h1>
        <p className="text-neutral-400 mt-2">Here's your favorite music.</p>
      </div>
      
      <div className="px-6">
        <h2 className="text-2xl font-bold mb-4">Your Playlists</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {playlists.map((playlist) => (
            <div
              key={playlist.id}
              className="bg-neutral-900/40 hover:bg-neutral-800 p-4 rounded-lg transition-all cursor-pointer group hover:scale-[1.02] duration-300"
              onClick={() => window.location.href = `/dashboard/playlists/${playlist.id}`}
            >
              <div className="relative mb-4 shadow-lg rounded-md overflow-hidden">
                <img
                  src={playlist.images?.[0]?.url || "/placeholder.png"}
                  alt={playlist.name}
                  className="w-full aspect-square object-cover"
                />
              </div>
              <h3 className="font-bold truncate text-base mb-1">{playlist.name}</h3>
              <p className="text-xs text-neutral-400 truncate">
                By {playlist.owner.display_name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
