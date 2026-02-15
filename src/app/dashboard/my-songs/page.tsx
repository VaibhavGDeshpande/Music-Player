"use client";

import { useEffect, useState } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import SongRow from "@/components/SongRow";

export const dynamic = "force-dynamic";

export default function MySongsPage() {
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { refreshLibrary } = usePlayer();

  useEffect(() => {
    fetch("/api/my-songs")
      .then((res) => res.json())
      .then((data) => {
        if (data.songs) setSongs(data.songs);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load songs", err);
        setLoading(false);
      });
  }, []);

  // Songs from my-songs are already downloaded, so download is a no-op
  const handleDownload = async (_track: any) => {
    // already downloaded
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
      <div className="mb-8">
        <h1 className="text-3xl md:text-5xl font-bold">My Songs</h1>
        <p className="text-neutral-400 mt-2">
          {songs.length} downloaded songs
        </p>
      </div>

      {songs.length === 0 ? (
        <div className="text-neutral-400">
          You haven't downloaded any songs yet. Go to a playlist and click the
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
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE LIST */}
          <div className="md:hidden space-y-3">
            {normalizedSongs.map((track, index) => (
              <SongRow
                key={track.id + index}
                track={track}
                index={index}
                onDownload={handleDownload}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}