"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";

export default function PlaylistDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const [playlist, setPlaylist] = useState<any>(null);
  const [showOptions, setShowOptions] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/playlists/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          console.error("Failed to load playlist:", data.error);
          setPlaylist({ error: data.error });
        } else {
          setPlaylist(data);
        }
      })
      .catch(err => {
        console.error("Network error:", err);
        setPlaylist({ error: "Failed to connect to server" });
      });
  }, [id]);

  if (!playlist) return <div className="text-white p-10">Loading...</div>;
  if (playlist.error) return <div className="text-red-500 p-10">Error: {JSON.stringify(playlist.error)}</div>;

  return (
    <div className="text-white relative">
      <div className="flex items-end gap-6 mb-8">
        <img
          src={playlist.images?.[0]?.url || "/placeholder.png"}
          alt={playlist.name}
          className="w-52 h-52 shadow-2xl rounded-md"
        />
        <div>
          <p className="text-sm font-bold uppercase mb-2">Playlist</p>
          <h1 className="text-5xl md:text-7xl font-bold mb-4">{playlist.name}</h1>
          <p className="text-neutral-400">{playlist.description}</p>
          <div className="mt-2 flex items-center gap-1 text-sm font-semibold">
            <span>{playlist.owner?.display_name || "Unknown"}</span>
            <span className="w-1 h-1 bg-white rounded-full mx-1"></span>
            <span>{playlist.tracks?.total || 0} songs</span>
          </div>
        </div>
      </div>

      <div className="bg-black/20 p-6 rounded-md">
        <table className="w-full text-left text-neutral-400">
          <thead>
            <tr className="border-b border-neutral-700 text-sm uppercase">
              <th className="pb-3 w-12 text-center">#</th>
              <th className="pb-3">Title</th>
              <th className="pb-3">Album</th>
              <th className="pb-3 text-right">Duration</th>
              <th className="pb-3 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {(playlist.tracks?.items || []).map((item: any, index: number) => {
              const track = item.track;
              if (!track) return null;

              return (
                <tr
                  key={track.id + index}
                  className="hover:bg-white/10 transition group rounded-md relative"
                >
                  <td className="py-3 px-2 rounded-l-md text-center">
                    {index + 1}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-4">
                      <img
                        src={track.album.images[2]?.url}
                        alt={track.name}
                        className="w-10 h-10 rounded-sm"
                      />
                      <div>
                        <p className="text-white font-semibold">{track.name}</p>
                        <p className="text-sm">
                          {track.artists.map((a: any) => a.name).join(", ")}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3">{track.album.name}</td>
                  <td className="py-3 text-right">
                    {Math.floor(track.duration_ms / 60000)}:
                    {((track.duration_ms % 60000) / 1000)
                      .toFixed(0)
                      .padStart(2, "0")}
                  </td>
                  <td className="py-3 px-2 rounded-r-md text-right relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowOptions(showOptions === track.id ? null : track.id);
                      }}
                      className="text-white hover:text-green-500 font-bold"
                    >
                      ⋮
                    </button>
                    
                    {showOptions === track.id && (
                      <div className="absolute right-0 top-10 bg-neutral-800 rounded-md shadow-xl z-50 w-48 py-2 border border-neutral-700">
                        <button
                          className="w-full text-left px-4 py-2 hover:bg-neutral-700 text-white flex items-center gap-2"
                          onClick={() => alert(`Downloading "${track.name}" to device...`)}
                        >
                          <span>⬇️</span> Download for Device
                        </button>
                        <button
                          className="w-full text-left px-4 py-2 hover:bg-neutral-700 text-white flex items-center gap-2"
                          onClick={() => alert(`Saving "${track.name}" to cloud...`)}
                        >
                          <span>☁️</span> Save in Cloud
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Click outside to close options */}
      {showOptions && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowOptions(null)}
        />
      )}
    </div>
  );
}
