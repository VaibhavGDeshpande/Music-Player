"use client";

import { useState } from "react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setResults(data);
  };

  return (
    <div className="text-white md:ml-64 pb-32">
      <form onSubmit={handleSearch} className="mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What do you want to listen to?"
          className="w-full bg-neutral-800 text-white p-4 rounded-full focus:outline-none focus:ring-2 focus:ring-white placeholder-neutral-500"
        />
      </form>

      {results && (
        <div className="space-y-8">
          {results.tracks?.items.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-4">Songs</h2>
              <div className="space-y-2">
                {results.tracks.items.slice(0, 5).map((track: any) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-4 hover:bg-white/10 p-2 rounded-md transition group"
                  >
                    <img
                      src={track.album.images[2]?.url}
                      alt={track.name}
                      className="w-12 h-12 rounded-sm"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-white">{track.name}</p>
                      <p className="text-sm text-neutral-400">
                        {track.artists.map((a: any) => a.name).join(", ")}
                      </p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 text-neutral-400">
                      {Math.floor(track.duration_ms / 60000)}:
                      {((track.duration_ms % 60000) / 1000).toFixed(0).padStart(2, "0")}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {results.artists?.items.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-4">Artists</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {results.artists.items.slice(0, 4).map((artist: any) => (
                  <div
                    key={artist.id}
                    className="bg-neutral-900 p-4 rounded-md hover:bg-neutral-800 transition cursor-pointer group text-center"
                  >
                    <div className="relative mb-4">
                      <img
                        src={artist.images[0]?.url || "/placeholder.png"}
                        alt={artist.name}
                        className="w-32 h-32 rounded-full mx-auto object-cover shadow-lg"
                      />
                    </div>
                    <h3 className="font-bold truncate">{artist.name}</h3>
                    <p className="text-sm text-neutral-400">Artist</p>
                  </div>
                ))}
              </div>
            </section>
          )}

           {results.albums?.items.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-4">Albums</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {results.albums.items.slice(0, 4).map((album: any) => (
                  <div
                    key={album.id}
                    className="bg-neutral-900 p-4 rounded-md hover:bg-neutral-800 transition cursor-pointer group"
                  >
                    <div className="relative mb-4">
                      <img
                        src={album.images[0]?.url || "/placeholder.png"}
                        alt={album.name}
                        className="w-full aspect-square object-cover rounded-md shadow-lg"
                      />
                    </div>
                    <h3 className="font-bold truncate">{album.name}</h3>
                    <p className="text-sm text-neutral-400 truncate">
                      {album.artists.map((a: any) => a.name).join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
