"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function DashboardPage() {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/playlists")
      .then((res) => res.json())
      .then((data) => {
        if (data.items) {
          setPlaylists(data.items);
        }
      })
      .finally(() => setLoading(false));
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
      <div className="bg-gradient-to-b from-green-900/50 to-transparent px-4 md:px-8 py-8 rounded-b-xl mb-6 animate-fadeIn">
        <h1 className="text-4xl font-bold animate-fadeInUp">{getGreeting()}</h1>
        <p className="text-neutral-400 mt-2 animate-fadeInUp stagger-2">Here&apos;s your favorite music.</p>
      </div>
      
      <div className="px-6">
        <h2 className="text-2xl font-bold mb-4 animate-fadeInUp stagger-2">Your Playlists</h2>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className={`bg-neutral-900/40 p-4 rounded-lg animate-staggerFadeIn stagger-${Math.min(i + 1, 12)}`}>
                <div className="skeleton w-full aspect-square rounded-md mb-4" />
                <div className="skeleton h-4 w-3/4 mb-2" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Playlist grid */}
        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {playlists.map((playlist, index) => (
              <div
                key={playlist.id}
                className={`bg-neutral-900/40 hover:bg-neutral-800 p-4 rounded-lg transition-all cursor-pointer group hover-lift animate-staggerFadeIn stagger-${Math.min(index + 1, 12)}`}
                onClick={() => window.location.href = `/dashboard/playlists/${playlist.id}`}
              >
                <div className="relative mb-4 shadow-lg rounded-md overflow-hidden">
                  <img
                    src={playlist.images?.[0]?.url || "/placeholder.svg"}
                    alt={playlist.name}
                    className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Play button overlay */}
                  <div className="absolute bottom-2 right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    <span className="text-black text-sm ml-0.5">▶</span>
                  </div>
                </div>
                <h3 className="font-bold truncate text-base mb-1 group-hover:text-white transition-colors">
                  {playlist.name}
                </h3>
                <p className="text-xs text-neutral-400 truncate">
                  By {playlist.owner.display_name}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
