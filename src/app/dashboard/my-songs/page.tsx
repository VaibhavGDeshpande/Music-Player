"use client";

import { useEffect, useState } from "react";

export const dynamic = 'force-dynamic';

export default function MySongsPage() {
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/my-songs")
      .then((res) => res.json())
      .then((data) => {
        if (data.songs) {
          setSongs(data.songs);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load songs", err);
        setLoading(false);
      });
  }, []);

  const handlePlay = (song: any) => {
    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/music/${song.storage_path}`;
    
    const event = new CustomEvent("play_track", {
      detail: {
        url: publicUrl,
        title: song.title,
        artist: song.artist,
        cover: song.cover_url,
      },
    });
    window.dispatchEvent(event);
  };

  if (loading) return <div className="text-white p-10">Loading your library...</div>;

  return (
    <div className="text-white relative">
      <h1 className="text-4xl font-bold mb-8">My Songs</h1>

      {songs.length === 0 ? (
        <div className="text-neutral-400">
          You haven't downloaded any songs yet. Go to a playlist and click the download button!
        </div>
      ) : (
        <div className="bg-black/20 p-6 rounded-md">
          <table className="w-full text-left text-neutral-400">
            <thead>
              <tr className="border-b border-neutral-700 text-sm uppercase">
                <th className="pb-3 w-12 text-center">#</th>
                <th className="pb-3">Title</th>
                <th className="pb-3">Album</th>
                <th className="pb-3 text-right">Added</th>
                <th className="pb-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {songs.map((song, index) => (
                <tr
                  key={song.id}
                  className="hover:bg-white/10 transition group rounded-md cursor-pointer"
                  onClick={() => handlePlay(song)}
                >
                  <td className="py-3 px-2 rounded-l-md text-center">
                    {index + 1}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-4">
                      <img
                        src={song.cover_url || "/placeholder.png"}
                        alt={song.title}
                        className="w-10 h-10 rounded-sm"
                      />
                      <div>
                        <p className="text-white font-semibold">{song.title}</p>
                        <p className="text-sm">{song.artist}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3">{song.album || "Unknown Album"}</td>
                  <td className="py-3 text-right text-sm">
                    {new Date(song.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-2 rounded-r-md text-right">
                    <button className="text-white hover:text-green-500 opacity-0 group-hover:opacity-100 transition">
                      ▶
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
