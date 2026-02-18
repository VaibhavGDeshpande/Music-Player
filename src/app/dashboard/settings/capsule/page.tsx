"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CapsulePage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/capsule")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full text-white">
        <div className="w-10 h-10 border-3 border-neutral-600 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!stats) {
    return <div className="p-8 text-white">Failed to load stats.</div>;
  }

  return (
    <div className="text-white pb-32 px-4 md:px-8 pt-8 bg-gradient-to-b from-purple-900/20 to-black min-h-full">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-neutral-700 transition"
          >
            ←
          </button>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
            Your Monthly Capsule
          </h1>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          
          {/* Total Minutes Card */}
          <div className="bg-neutral-900/50 p-6 rounded-2xl border border-white/5 backdrop-blur-sm hover:border-purple-500/30 transition-colors">
            <h3 className="text-neutral-400 text-sm uppercase tracking-wider font-semibold mb-2">Time Listened</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-white">{stats.total_minutes}</span>
              <span className="text-neutral-400">min</span>
            </div>
            <p className="text-xs text-neutral-500 mt-2">in the last 30 days</p>
          </div>

          {/* Unique Songs Card */}
          <div className="bg-neutral-900/50 p-6 rounded-2xl border border-white/5 backdrop-blur-sm hover:border-blue-500/30 transition-colors">
            <h3 className="text-neutral-400 text-sm uppercase tracking-wider font-semibold mb-2">Unique Songs</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-white">{stats.unique_tracks || 0}</span>
              <span className="text-neutral-400">tracks</span>
            </div>
            <p className="text-xs text-neutral-500 mt-2">streaming non-stop</p>
          </div>

          {/* Vibe Card */}
          <div className="bg-neutral-900/50 p-6 rounded-2xl border border-white/5 backdrop-blur-sm hover:border-green-500/30 transition-colors">
             <h3 className="text-neutral-400 text-sm uppercase tracking-wider font-semibold mb-2">Top Vibe</h3>
             <div className="text-3xl font-bold text-white mt-2">
               {stats.top_artists?.[0]?.name || "Explorer"}
             </div>
             <p className="text-xs text-neutral-500 mt-2">Based on your top artist</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Top Artists */}
          <section className="bg-neutral-900/30 p-6 rounded-2xl border border-white/5">
            <h2 className="text-2xl font-bold mb-6">Top Artists</h2>
            <div className="space-y-4">
              {stats.top_artists.map((artist: any, i: number) => (
                <div key={artist.name} className="flex items-center gap-4 group">
                  <span className="text-2xl font-bold text-neutral-600 w-8">{i + 1}</span>
                  <img 
                    src={artist.image || "/placeholder.svg"} 
                    alt={artist.name}
                    className="w-12 h-12 rounded-full object-cover" 
                  />
                  <div className="flex-1">
                    <div className="font-bold">{artist.name}</div>
                    <div className="text-xs text-neutral-500">{artist.count} plays</div>
                  </div>
                  <div className="w-full bg-neutral-800 h-1.5 rounded-full mt-2 max-w-[100px] overflow-hidden">
                    <div 
                      className="bg-purple-500 h-full rounded-full" 
                      style={{ width: `${(artist.count / stats.top_artists[0].count) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
              {stats.top_artists.length === 0 && (
                <div className="text-neutral-500 italic">No artist data yet. Start listening!</div>
              )}
            </div>
          </section>

          {/* Top Tracks */}
          <section className="bg-neutral-900/30 p-6 rounded-2xl border border-white/5">
            <h2 className="text-2xl font-bold mb-6">Top Tracks</h2>
            <div className="space-y-4">
              {stats.top_tracks.map((track: any, i: number) => (
                <div key={track.id} className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-neutral-600 w-8">{i + 1}</span>
                  <img 
                    src={track.image || "/placeholder.svg"} 
                    alt={track.name}
                    className="w-12 h-12 rounded bg-neutral-800 object-cover" 
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{track.name}</div>
                    <div className="text-xs text-neutral-400 truncate">{track.artist}</div>
                  </div>
                  <div className="text-sm font-medium text-purple-400">{track.count} plays</div>
                </div>
              ))}
               {stats.top_tracks.length === 0 && (
                <div className="text-neutral-500 italic">No track data yet. Start listening!</div>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
