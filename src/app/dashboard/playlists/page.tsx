"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SpotifyPlaylistsPage() {
  const router = useRouter();
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/playlists")
      .then((res) => res.json())
      .then((data) => {
        if (data.items) setPlaylists(data.items);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full pt-20">
        <div className="w-10 h-10 border-3 border-neutral-600 border-t-green-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="text-white px-4 md:px-8 pb-32">
      <div className="mb-8 pt-6">
        <h1 className="text-3xl md:text-5xl font-bold">Spotify Playlists</h1>
        <p className="text-neutral-400 mt-2">{playlists.length} playlists</p>
      </div>

      {playlists.length === 0 ? (
        <div className="text-neutral-400 text-center py-16">
          <p className="text-4xl mb-4">😶</p>
          <p>No Spotify playlists found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {playlists.map((playlist) => (
            <div
              key={playlist.id}
              onClick={() => router.push(`/dashboard/playlists/${playlist.id}`)}
              className="bg-neutral-900/40 hover:bg-neutral-800 p-4 rounded-lg transition-all cursor-pointer group hover:-translate-y-1 duration-300 shadow-md hover:shadow-xl"
            >
              <div className="relative mb-4 aspect-square rounded-md overflow-hidden shadow-lg">
                <img
                  src={playlist.images?.[0]?.url || "/placeholder.svg"}
                  alt={playlist.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300" />
                <div className="absolute bottom-2 right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-xl">
                  <span className="text-black text-sm ml-0.5">▶</span>
                </div>
              </div>
              <h3 className="font-bold text-sm truncate mb-1 group-hover:text-green-400 transition-colors">
                {playlist.name}
              </h3>
              <p className="text-xs text-neutral-400 truncate">
                By {playlist.owner?.display_name || "Spotify"} • {playlist.tracks?.total || 0} tracks
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
