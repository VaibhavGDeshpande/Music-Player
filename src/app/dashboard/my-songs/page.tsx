"use client";

import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";

export default function MySongsPage() {
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handlePlay = (song: any) => {
    const formatTrack = (s: any) => ({
      title: s.title,
      artist: s.artist,
      cover: s.cover_url || "/placeholder.png",
      url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/music/${s.storage_path}`,
    });

    const queue = songs.map(formatTrack);
    const track = formatTrack(song);

    window.dispatchEvent(
      new CustomEvent("play_track", {
        detail: { track, queue },
      })
    );
  };

  if (loading)
    return <div className="text-white p-10">Loading your library...</div>;

  return (
    <div className="text-white px-4 md:px-8 pb-32 md:ml-64">

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
          <div className="hidden md:block bg-black/20 rounded-md overflow-hidden">
            <table className="w-full text-left text-neutral-400 text-sm">
              <thead className="sticky top-0 bg-black/80 backdrop-blur border-b border-neutral-700 uppercase text-xs tracking-wider">
                <tr>
                  <th className="py-4 px-4 w-12 text-center">#</th>
                  <th className="py-4 px-4">Title</th>
                  <th className="py-4 px-4">Album</th>
                  <th className="py-4 px-4 text-right">Added</th>
                  <th className="py-4 px-4 w-12 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {songs.map((song, index) => (
                  <tr
                    key={song.id}
                    onClick={() => handlePlay(song)}
                    className="hover:bg-white/10 transition group cursor-pointer"
                  >
                    <td className="py-3 px-4 text-center">
                      {index + 1}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-4">
                        <img
                          src={song.cover_url || "/placeholder.png"}
                          alt={song.title}
                          className="w-10 h-10 rounded-sm"
                        />
                        <div>
                          <p className="text-white font-medium group-hover:text-green-400">
                            {song.title}
                          </p>
                          <p className="text-xs text-neutral-400">
                            {song.artist}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-neutral-300">
                      {song.album || "Unknown Album"}
                    </td>

                    <td className="py-3 px-4 text-right text-neutral-400">
                      {new Date(song.created_at).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button className="opacity-0 group-hover:opacity-100 transition hover:text-green-400">
                        ▶
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARD LIST */}
          <div className="md:hidden space-y-3">
            {songs.map((song) => (
              <div
                key={song.id}
                onClick={() => handlePlay(song)}
                className="flex items-center justify-between bg-black/30 p-3 rounded-md"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={song.cover_url || "/placeholder.png"}
                    alt={song.title}
                    className="w-12 h-12 rounded-sm"
                  />
                  <div className="max-w-[180px]">
                    <p className="text-white font-medium truncate">
                      {song.title}
                    </p>
                    <p className="text-xs text-neutral-400 truncate">
                      {song.artist}
                    </p>
                  </div>
                </div>

                <button className="text-green-400 text-lg">
                  ▶
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}