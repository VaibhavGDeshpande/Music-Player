"use client";

import { useState } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import SongRow from "@/components/SongRow";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { downloadedSongs, refreshLibrary } = usePlayer();

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error("Search failed:", err);
      showToast("Search failed. Please try again.", "error");
    } finally {
      setIsSearching(false);
    }
  };

  const handleDownload = async (track: any) => {
    if (downloadedSongs.has(track.id)) return;

    showToast(`Downloading "${track.name}"...`, "info");

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackId: track.id,
          spotifyUrl: track.external_urls?.spotify,
        }),
      });

      if (res.ok) {
        refreshLibrary();
        showToast(`Saved "${track.name}" to Cloud!`, "success");
      } else {
        const err = await res.json();
        showToast(`Failed to save: ${err.error || "Unknown error"}`, "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Error saving song.", "error");
    }
  };

  const topTrack = results?.tracks?.items?.[0];
  const otherTracks = results?.tracks?.items?.slice(1, 6) || [];
  const artists = results?.artists?.items?.slice(0, 6) || [];
  const albums = results?.albums?.items?.slice(0, 6) || [];

  const noResults = hasSearched && !isSearching && results &&
    (!results.tracks?.items?.length && !results.artists?.items?.length && !results.albums?.items?.length);

  return (
    <div className="text-white pb-32 px-2 md:px-6">

      {/* Search Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-6">Search</h1>

        <form onSubmit={handleSearch} className="relative max-w-2xl">
          {/* Search Icon */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.3-4.3"/>
            </svg>
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What do you want to listen to?"
            className="w-full bg-neutral-800/80 backdrop-blur-sm text-white pl-12 pr-4 py-4 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-neutral-500 text-base transition-shadow"
          />

          {/* Clear button */}
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); setResults(null); setHasSearched(false); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition"
            >
              ✕
            </button>
          )}
        </form>
      </div>

      {/* Loading State */}
      {isSearching && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-3 border-neutral-600 border-t-green-500 rounded-full animate-spin mb-4"></div>
          <p className="text-neutral-400">Searching for &quot;{query}&quot;...</p>
        </div>
      )}

      {/* Empty State (before any search) */}
      {!hasSearched && !results && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-6xl mb-4 opacity-40">🔍</div>
          <h2 className="text-xl font-semibold text-neutral-300 mb-2">Find your next favorite</h2>
          <p className="text-neutral-500 max-w-md">
            Search for songs, artists, or albums across Spotify&apos;s library
          </p>
        </div>
      )}

      {/* No Results */}
      {noResults && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl mb-4 opacity-40">😶</div>
          <h2 className="text-xl font-semibold text-neutral-300 mb-2">No results found</h2>
          <p className="text-neutral-500">
            Try a different search term or check your spelling
          </p>
        </div>
      )}

      {/* Results */}
      {results && !isSearching && (
        <div className="space-y-10">

          {/* Top Result + Songs Side by Side */}
          {(topTrack || otherTracks.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,1fr)_2fr] gap-6">

              {/* Top Result Card */}
              {topTrack && (
                <section>
                  <h2 className="text-2xl font-bold mb-4">Top Result</h2>
                  <div
                    className="bg-neutral-900/60 hover:bg-neutral-800/80 p-5 rounded-xl transition-all cursor-pointer group relative overflow-hidden"
                    onClick={() => {
                      if (downloadedSongs.has(topTrack.id)) {
                        handleDownload(topTrack); // triggers play logic
                      }
                    }}
                  >
                    {/* Gradient bg accent */}
                    <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 to-transparent pointer-events-none"></div>

                    <img
                      src={topTrack.album?.images?.[0]?.url || "/placeholder.png"}
                      alt={topTrack.name}
                      className="w-24 h-24 md:w-28 md:h-28 rounded-lg object-cover shadow-xl mb-5 relative z-10"
                    />

                    <h3 className="text-2xl md:text-3xl font-bold mb-2 relative z-10 truncate">
                      {topTrack.name}
                    </h3>
                    <p className="text-neutral-400 relative z-10">
                      <span className="bg-neutral-800 text-white text-xs font-semibold px-2.5 py-1 rounded-full mr-2">
                        SONG
                      </span>
                      {topTrack.artists?.map((a: any) => a.name).join(", ")}
                    </p>

                    {/* Play button on hover */}
                    <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 z-10">
                      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition">
                        <span className="text-black text-lg ml-0.5">▶</span>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Songs List */}
              {otherTracks.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold mb-4">Songs</h2>
                  <div className="bg-black/20 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-neutral-400 text-sm">
                      <tbody>
                        {/* Include top track as first row too */}
                        {topTrack && (
                          <SongRow
                            key={topTrack.id}
                            track={topTrack}
                            index={0}
                            onDownload={handleDownload}
                          />
                        )}
                        {otherTracks.map((track: any, index: number) => (
                          <SongRow
                            key={track.id}
                            track={track}
                            index={index + 1}
                            onDownload={handleDownload}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          )}

          {/* Artists */}
          {artists.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-4">Artists</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {artists.map((artist: any) => (
                  <div
                    key={artist.id}
                    className="bg-neutral-900/50 hover:bg-neutral-800/70 p-4 rounded-xl transition-all cursor-pointer group text-center"
                  >
                    <div className="relative mb-4 mx-auto w-28 h-28 md:w-32 md:h-32">
                      <img
                        src={artist.images?.[0]?.url || "/placeholder.png"}
                        alt={artist.name}
                        className="w-full h-full rounded-full object-cover shadow-lg"
                      />
                      {/* Hover play button */}
                      <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition">
                          <span className="text-black text-sm ml-0.5">▶</span>
                        </div>
                      </div>
                    </div>
                    <h3 className="font-bold text-sm truncate">{artist.name}</h3>
                    <p className="text-xs text-neutral-500 mt-1">Artist</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Albums */}
          {albums.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-4">Albums</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {albums.map((album: any) => (
                  <div
                    key={album.id}
                    className="bg-neutral-900/50 hover:bg-neutral-800/70 p-4 rounded-xl transition-all cursor-pointer group"
                  >
                    <div className="relative mb-3">
                      <img
                        src={album.images?.[0]?.url || "/placeholder.png"}
                        alt={album.name}
                        className="w-full aspect-square object-cover rounded-lg shadow-lg"
                      />
                      {/* Hover play button */}
                      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition">
                          <span className="text-black text-sm ml-0.5">▶</span>
                        </div>
                      </div>
                    </div>
                    <h3 className="font-bold text-sm truncate">{album.name}</h3>
                    <p className="text-xs text-neutral-500 truncate mt-1">
                      {album.release_date?.split("-")[0]} • {album.artists?.map((a: any) => a.name).join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-24 right-5 px-5 py-3 rounded-lg shadow-2xl text-white font-medium z-50 flex items-center gap-2 animate-slide-up ${
            toast.type === "success"
              ? "bg-green-600/90 backdrop-blur-sm"
              : toast.type === "error"
              ? "bg-red-600/90 backdrop-blur-sm"
              : "bg-blue-600/90 backdrop-blur-sm"
          }`}
        >
          <span>
            {toast.type === "success" ? "✅" : toast.type === "error" ? "❌" : "💾"}
          </span>
          {toast.message}
        </div>
      )}
    </div>
  );
}