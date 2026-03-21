"use client";

import { useEffect, useState } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import SongRow from "@/components/SongRow";

export const dynamic = "force-dynamic";

export default function MySongsPage() {
  const { mySongsCache, refreshMySongsCache } = usePlayer();
  const [songs, setSongs] = useState<any[]>(mySongsCache || []);
  const [loading, setLoading] = useState(mySongsCache === null);

  useEffect(() => {
    if (mySongsCache !== null) {
      setSongs(mySongsCache);
      setLoading(false);
    } else {
      refreshMySongsCache().then((data) => {
        setSongs(data);
        setLoading(false);
      });
    }
  }, [mySongsCache, refreshMySongsCache]);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Songs from my-songs are already downloaded, so download is a no-op
  const handleDownload = async (_track: any) => {
    // already downloaded
  };

  const handleRemove = async (track: any) => {
    if (confirm(`Are you sure you want to remove "${track.name}" from your cloud library?`)) {
      setDeletingId(track.id);
      try {
        const res = await fetch("/api/my-songs", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trackId: track.id }),
        });
        
        if (res.ok) {
          refreshMySongsCache().then((data) => {
            setSongs(data);
            setDeletingId(null);
          });
        } else {
          alert("Failed to remove song.");
          setDeletingId(null);
        }
      } catch (error) {
        console.error(error);
        alert("An error occurred while removing the song.");
        setDeletingId(null);
      }
    }
  };

  if (loading)
    return <div className="text-white p-10">Loading your library...</div>;

  // Normalize local DB songs to SongRow-compatible format
  const normalizedSongs = songs.map((s) => ({
    id: s.spotify_id || s.id,
    name: s.title,
    artists: [{ name: s.artist }],
    album: { name: s.album || "Unknown", images: [{ url: s.cover_url }, { url: s.cover_url }, { url: s.cover_url }] },
    duration_ms: s.duration_ms || 0,
    added_at: s.created_at,
    cover_url: s.cover_url,
    storage_path: s.storage_path,
    external_urls: { spotify: `https://open.spotify.com/track/${s.spotify_id || s.id}` },
  }));

  return (
    <div className="text-white px-4 md:px-8 pb-32">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-10 text-center md:text-left pt-6">
        <div className="w-40 h-40 md:w-52 md:h-52 bg-gradient-to-br from-emerald-600 to-cyan-400 flex items-center justify-center shadow-2xl rounded-md">
          <span className="text-5xl md:text-6xl">🎵</span>
        </div>
        <div>
          <p className="text-xs md:text-sm font-bold uppercase mb-2">Library</p>
          <h1 className="text-3xl md:text-6xl font-bold mb-3">My Songs</h1>
          <p className="text-sm text-neutral-400">
            {songs.length} downloaded songs
          </p>
        </div>
      </div>

      {songs.length === 0 ? (
        <div className="text-neutral-400">
          You haven&apos;t downloaded any songs yet. Go to a playlist and click the
          download button!
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
                  <th className="pb-3 text-right">Added</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
            </thead>
            <tbody>
              {normalizedSongs.map((track, index) => (
                <SongRow
                  key={track.id + index}
                  track={track}
                  index={index}
                  onDownload={handleDownload}
                  showRemoveButton={true}
                  onRemove={handleRemove}
                  allTracks={normalizedSongs}
                />
              ))}
            </tbody>
          </table>
        </div>

          {/* MOBILE LIST */}
          <div className="md:hidden bg-black/20 p-3 rounded-md">
            <table className="w-full text-left text-neutral-400 text-sm">
              <tbody>
                {normalizedSongs.map((track, index) => (
                  <SongRow
                    key={track.id + index}
                    track={track}
                    index={index}
                    onDownload={handleDownload}
                    showRemoveButton={true}
                    onRemove={handleRemove}
                    allTracks={normalizedSongs}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}