"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function CapsuleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const monthParam = searchParams.get("month");
  const yearParam = searchParams.get("year");

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Calculate generic title based on params or fallback to "Your Monthly"
  let displayTitle = "Your Monthly Capsule";
  if (monthParam && yearParam) {
     const date = new Date(parseInt(yearParam), parseInt(monthParam) - 1, 1);
     displayTitle = date.toLocaleString('default', { month: 'long', year: 'numeric' }) + " Capsule";
  }

  useEffect(() => {
    let url = "/api/capsule";
    if (monthParam && yearParam) {
      url += `?month=${monthParam}&year=${yearParam}`;
    }

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [monthParam, yearParam]);

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            {/* <button 
              onClick={() => router.back()}
              className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-neutral-700 transition shrink-0"
            >
              ←
            </button> */}
            <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
              {displayTitle}
            </h1>
          </div>
          
          <Link 
            href="/dashboard/settings/capsules"
            className="flex items-center gap-2 bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 px-4 py-2 rounded-full transition-colors font-medium border border-purple-500/30 whitespace-nowrap self-start sm:self-auto"
          >
            🗓️ View Archive
          </Link>
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
            <p className="text-xs text-neutral-500 mt-2">this month</p>
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

export default function CapsulePage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-full text-white">
        <div className="w-10 h-10 border-3 border-neutral-600 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    }>
      <CapsuleContent />
    </Suspense>
  );
}
