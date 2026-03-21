"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import SongRow from "@/components/SongRow";

const LIMIT = 50;

export default function LikedSongsPage() {
  const [tracks, setTracks] = useState<any[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const fetchingRef = useRef(false); // prevent duplicate fetches
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const { downloadedSongs, refreshLibrary, likedSongsCache, refreshLikedSongsCache } = usePlayer();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Normalise a local DB song into the same shape as a Spotify track
  const normaliseLocalSong = (s: any) => ({
    id: s.spotify_id,
    name: s.title,
    artists: [{ name: s.artist }],
    album: {
      name: s.album || "Unknown",
      images: [{ url: s.cover_url }, { url: s.cover_url }, { url: s.cover_url }],
    },
    duration_ms: s.duration_ms || 0,
    storage_path: s.storage_path,
    cover_url: s.cover_url,
    external_urls: { spotify: `https://open.spotify.com/track/${s.spotify_id}` },
    source: "local",
  });

  // Fetch one page of Spotify liked songs and merge with local songs
  const fetchBatch = useCallback(
    async (currentOffset: number) => {
      if (fetchingRef.current || !hasMore) return;
      fetchingRef.current = true;
      setLoading(true);

      try {
        // Fetch Spotify page + local songs in parallel on first load
        const spotifyPromise = fetch(
          `/api/liked-songs?offset=${currentOffset}&limit=${LIMIT}`
        ).then((r) => (r.ok ? r.json() : Promise.reject(r.status)));

        const localPromise =
          currentOffset === 0
            ? likedSongsCache !== null
              ? Promise.resolve(likedSongsCache)
              : refreshLikedSongsCache()
            : Promise.resolve(null); // only need local songs once

        const [data, localSongs] = await Promise.all([spotifyPromise, localPromise]);

        // Build a map of local songs for quick lookup (first batch only)
        const localMap = new Map<string, any>();
        if (localSongs) {
          for (const s of localSongs) {
            localMap.set(s.spotify_id, normaliseLocalSong(s));
          }
        }

        const incoming: any[] = [];
        for (const item of data.items ?? []) {
          const t = item.track || item.item;
          if (!t) continue;

          const local = localMap.get(t.id);
          incoming.push({
            id: t.id,
            name: t.name,
            artists: t.artists,
            album: t.album,
            duration_ms: t.duration_ms,
            external_urls: t.external_urls,
            preview_url: t.preview_url,
            storage_path: local?.storage_path ?? null,
            cover_url: local?.cover_url ?? null,
            source: local ? "both" : "spotify",
          });
        }

        const noMore = incoming.length < LIMIT || !data.next;
        setHasMore(!noMore);
        setOffset(currentOffset + incoming.length);
        setTracks((prev) =>
          currentOffset === 0 ? incoming : [...prev, ...incoming]
        );
      } catch {
        // silently fail — keep existing tracks visible
      } finally {
        setLoading(false);
        setInitialLoading(false);
        fetchingRef.current = false;
      }
    },
    [hasMore, likedSongsCache, refreshLikedSongsCache]
  );

  // First batch on mount
  useEffect(() => {
    fetchBatch(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Intersection observer — fires fetchBatch when sentinel scrolls into view
  useEffect(() => {
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchBatch(offset);
        }
      },
      { rootMargin: "300px" } // start loading 300px before hitting the bottom
    );

    const el = sentinelRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasMore, loading, offset, fetchBatch]);

  const handleDownload = async (track: any) => {
    if (downloadedSongs.has(track.id)) return;
    showToast(`Downloading "${track.name}"...`, "info");

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackId: track.id,
          spotifyUrl:
            track.external_urls?.spotify ||
            `https://open.spotify.com/track/${track.id}`,
        }),
      });

      const data = await res.json();

      if (data.success || data.message === "Song already downloaded") {
        refreshLibrary();
        showToast(`Saved "${track.name}" to Cloud!`, "success");
      } else {
        showToast(`Download failed: ${data.error || "Unknown error"}`, "error");
      }
    } catch {
      showToast("Error downloading song", "error");
    }
  };

  return (
    <div className="text-white px-4 md:px-8 pb-32">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-10 text-center md:text-left pt-6">
        <div className="w-40 h-40 md:w-52 md:h-52 bg-gradient-to-br from-indigo-700 to-green-300 flex items-center justify-center shadow-2xl rounded-md">
          <span className="text-5xl md:text-6xl">❤️</span>
        </div>
        <div>
          <p className="text-xs md:text-sm font-bold uppercase mb-2">Playlist</p>
          <h1 className="text-3xl md:text-6xl font-bold mb-3">Liked Songs</h1>
          <p className="text-sm text-neutral-400">
            {initialLoading ? "Loading..." : `${tracks.length} songs${hasMore ? "+" : ""}`}
          </p>
        </div>
      </div>

      {initialLoading ? (
        <div className="text-neutral-400 text-center py-10">
          Loading your liked songs...
        </div>
      ) : (
        <>
          {/* DESKTOP TABLE */}
          <div className="hidden md:block bg-black/20 p-6 rounded-md overflow-hidden">
            <table className="w-full text-left text-neutral-400 text-sm">
              <thead className="border-b border-neutral-700 uppercase text-xs tracking-wider">
                <tr>
                  <th className="pb-3 w-12 text-center">#</th>
                  <th className="pb-3">Title</th>
                  <th className="pb-3">Album</th>
                  <th className="pb-3 text-right">Duration</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tracks.map((track, index) => (
                  <SongRow
                    key={track.id + index}
                    track={track}
                    index={index}
                    onDownload={handleDownload}
                    allTracks={tracks}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE LIST */}
          <div className="md:hidden bg-black/20 p-3 rounded-md">
            <table className="w-full text-left text-neutral-400 text-sm">
              <tbody>
                {tracks.map((track, index) => (
                  <SongRow
                    key={track.id + index}
                    track={track}
                    index={index}
                    onDownload={handleDownload}
                    allTracks={tracks}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Sentinel — triggers next batch when scrolled into view */}
          <div ref={sentinelRef} className="h-1" />

          {/* Loading indicator for subsequent batches */}
          {loading && !initialLoading && (
            <div className="text-neutral-400 text-center py-6 text-sm">
              Loading more songs...
            </div>
          )}

          {!hasMore && !loading && tracks.length > 0 && (
            <div className="text-neutral-600 text-center py-6 text-sm">
              All {tracks.length} songs loaded
            </div>
          )}
        </>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 px-6 py-3 rounded-md shadow-lg text-white font-medium transition-all z-50 ${
            toast.type === "success"
              ? "bg-green-600"
              : toast.type === "error"
              ? "bg-red-600"
              : "bg-blue-600"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}