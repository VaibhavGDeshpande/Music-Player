"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePlayer } from "@/contexts/PlayerContext";

export default function DashboardPage() {
  const router = useRouter();
  const { playTrack, downloadedSongs, currentTrack, isPlaying, togglePlay } = usePlayer();

  const [playlists, setPlaylists] = useState<any[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [loadingRecs, setLoadingRecs] = useState(true);

  useEffect(() => {
    fetch("/api/playlists")
      .then((res) => res.json())
      .then((data) => {
        if (data.items) setPlaylists(data.items);
      })
      .finally(() => setLoadingPlaylists(false));

    fetch("/api/recently-played")
      .then((res) => res.json())
      .then((data) => {
        if (data.items) {
          const seen = new Set<string>();
          const unique = data.items.filter((item: any) => {
            if (seen.has(item.track.id)) return false;
            seen.add(item.track.id);
            return true;
          });
          setRecentlyPlayed(unique.slice(0, 20));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingRecent(false));

    fetch("/api/recs")
      .then((res) => res.json())
      .then((data) => {
        if (data.tracks) setRecommendations(data.tracks.slice(0, 20));
      })
      .catch(() => {})
      .finally(() => setLoadingRecs(false));
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const handlePlayTrack = (track: any) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
      return;
    }
    const url = downloadedSongs.has(track.id)
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/music/${track.storage_path}`
      : `/api/stream/${track.id}`;
    playTrack({
      id: track.id,
      title: track.name,
      artist: track.artists?.map((a: any) => a.name).join(", ") || "Unknown",
      cover: track.album?.images?.[0]?.url,
      url,
      duration: track.duration_ms,
      album: track.album?.name,
    });
  };

  // Build quick-access items from playlists + liked songs  
  const quickAccessItems = playlists.slice(0, 8).map((p) => ({
    id: p.id,
    name: p.name,
    image: p.images?.[0]?.url || "/placeholder.svg",
    type: "playlist" as const,
  }));

  return (
    <div className="text-white pb-32">
      {/* Greeting with gradient */}
      <div className="bg-gradient-to-b from-neutral-700/60 via-neutral-800/30 to-transparent px-4 md:px-8 pt-6 pb-2">
        <h1 className="text-2xl md:text-3xl font-bold mb-5">{getGreeting()}</h1>

        {/* ===== Quick Access Grid (Spotify-style compact cards) ===== */}
        {loadingPlaylists ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center bg-white/5 rounded-md h-12 md:h-14 overflow-hidden">
                <div className="skeleton w-12 h-12 md:w-14 md:h-14 flex-shrink-0" />
                <div className="skeleton h-3 w-24 ml-3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
            {quickAccessItems.map((item) => {
              const isCurrent = false; // playlists don't have a single track ID to compare
              return (
                <div
                  key={item.id}
                  className="flex items-center bg-white/[0.07] hover:bg-white/[0.15] rounded-md h-12 md:h-14 overflow-hidden cursor-pointer transition-all duration-200 group tile-press"
                  onClick={() => router.push(`/dashboard/playlists/${item.id}`)}
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-12 h-12 md:w-14 md:h-14 object-cover flex-shrink-0 shadow-md"
                  />
                  <span className="px-3 text-[13px] md:text-sm font-bold truncate flex-1">
                    {item.name}
                  </span>
                  {/* Play button on hover */}
                  <div className="w-8 h-8 bg-green-500 rounded-full items-center justify-center shadow-lg mr-2 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300 hidden md:flex">
                    <span className="text-black text-xs ml-0.5">▶</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== Scrollable Sections ===== */}
      <div className="px-4 md:px-8 space-y-8 mt-4">

        {/* Recently Played — horizontal scroll */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-bold hover:underline cursor-pointer">Recently Played</h2>
            <span className="text-xs font-bold text-neutral-400 hover:text-white cursor-pointer tracking-wide uppercase transition-colors">Show all</span>
          </div>

          {loadingRecent ? (
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[160px] md:w-[180px]">
                  <div className="skeleton w-full aspect-square rounded-lg mb-3" />
                  <div className="skeleton h-3.5 w-3/4 mb-2" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : recentlyPlayed.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-scroll" style={{ scrollbarWidth: 'none' }}>
              {recentlyPlayed.map((item, index) => {
                const track = item.track;
                const isCurrentlyPlaying = currentTrack?.id === track.id && isPlaying;
                return (
                  <div
                    key={`${track.id}-${index}`}
                    className="flex-shrink-0 w-[150px] md:w-[180px] bg-neutral-900/40 hover:bg-neutral-800 p-3 rounded-lg transition-all cursor-pointer group"
                    onClick={() => handlePlayTrack(track)}
                  >
                    <div className="relative mb-3 rounded-md overflow-hidden shadow-lg">
                      <img
                        src={track.album?.images?.[0]?.url || "/placeholder.svg"}
                        alt={track.name}
                        className="w-full aspect-square object-cover"
                      />
                      <div className={`absolute bottom-2 right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 ${isCurrentlyPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0'}`}>
                        <span className="text-black text-sm ml-0.5">
                          {isCurrentlyPlaying ? "⏸" : "▶"}
                        </span>
                      </div>
                    </div>
                    <h3 className={`font-bold text-sm truncate mb-1 ${isCurrentlyPlaying ? 'text-green-400' : 'text-white'}`}>
                      {track.name}
                    </h3>
                    <p className="text-xs text-neutral-400 truncate">
                      {track.artists?.map((a: any) => a.name).join(", ")}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-neutral-500 text-sm">Play some music to see your history here.</p>
          )}
        </section>

        {/* Recommended For You — horizontal scroll */}
        <section className="section-reveal">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-bold hover:underline cursor-pointer">Made For You</h2>
            <span className="text-xs font-bold text-neutral-400 hover:text-white cursor-pointer tracking-wide uppercase transition-colors">Show all</span>
          </div>

          {loadingRecs ? (
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[160px] md:w-[180px]">
                  <div className="skeleton w-full aspect-square rounded-lg mb-3" />
                  <div className="skeleton h-3.5 w-3/4 mb-2" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : recommendations.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
              {recommendations.map((track, index) => {
                const isCurrentlyPlaying = currentTrack?.id === track.id && isPlaying;
                return (
                  <div
                    key={`${track.id}-${index}`}
                    className="flex-shrink-0 w-[150px] md:w-[180px] bg-neutral-900/40 hover:bg-neutral-800 p-3 rounded-lg transition-all cursor-pointer group"
                    onClick={() => handlePlayTrack(track)}
                  >
                    <div className="relative mb-3 rounded-md overflow-hidden shadow-lg">
                      <img
                        src={track.album?.images?.[0]?.url || "/placeholder.svg"}
                        alt={track.name}
                        className="w-full aspect-square object-cover"
                      />
                      <div className={`absolute bottom-2 right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 ${isCurrentlyPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0'}`}>
                        <span className="text-black text-sm ml-0.5">
                          {isCurrentlyPlaying ? "⏸" : "▶"}
                        </span>
                      </div>
                    </div>
                    <h3 className={`font-bold text-sm truncate mb-1 ${isCurrentlyPlaying ? 'text-green-400' : 'text-white'}`}>
                      {track.name}
                    </h3>
                    <p className="text-xs text-neutral-400 truncate leading-relaxed line-clamp-2" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', whiteSpace: 'normal' }}>
                      {track.artists?.map((a: any) => a.name).join(", ")}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-neutral-500 text-sm">Listen to more music to get personalized recommendations.</p>
          )}
        </section>

        {/* Your Playlists — horizontal scroll */}
        <section className="section-reveal">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-bold hover:underline cursor-pointer">Your Playlists</h2>
            <span className="text-xs font-bold text-neutral-400 hover:text-white cursor-pointer tracking-wide uppercase transition-colors">Show all</span>
          </div>

          {loadingPlaylists ? (
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[160px] md:w-[180px]">
                  <div className="skeleton w-full aspect-square rounded-lg mb-3" />
                  <div className="skeleton h-3.5 w-3/4 mb-2" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-scroll" style={{ scrollbarWidth: 'none' }}>
              {playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  className="flex-shrink-0 w-[150px] md:w-[180px] bg-neutral-900/40 hover:bg-neutral-800 p-3 rounded-lg transition-all cursor-pointer group"
                  onClick={() => router.push(`/dashboard/playlists/${playlist.id}`)}
                >
                  <div className="relative mb-3 rounded-md overflow-hidden shadow-lg">
                    <img
                      src={playlist.images?.[0]?.url || "/placeholder.svg"}
                      alt={playlist.name}
                      className="w-full aspect-square object-cover"
                    />
                    <div className="absolute bottom-2 right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                      <span className="text-black text-sm ml-0.5">▶</span>
                    </div>
                  </div>
                  <h3 className="font-bold text-sm truncate mb-1 group-hover:text-white transition-colors">
                    {playlist.name}
                  </h3>
                  <p className="text-xs text-neutral-400 truncate">
                    By {playlist.owner?.display_name}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Hide scrollbar */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
