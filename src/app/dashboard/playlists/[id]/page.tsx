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
  
  console.log("Render State - Playlist:", playlist);
  console.log("Render State - Tracks:", playlist?.tracks);
  console.log("Render State - Items:", playlist?.tracks?.items);

  if (!playlist) return <div className="text-white p-10">Loading...</div>;
  if (playlist.error) return <div className="text-red-500 p-10">Error: {JSON.stringify(playlist.error)}</div>;

  const handleDownload = async (track: any) => {
    setShowOptions(null);
    const toastId = `download-${track.id}`;

    const startMsg = document.createElement("div");
    startMsg.innerText = `Downloading ${track.name}...`;
    startMsg.className = "fixed bottom-5 right-5 bg-blue-600 text-white p-4 rounded-md z-50 animate-bounce";
    startMsg.id = toastId;
    document.body.appendChild(startMsg);

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackId: track.id,
          spotifyUrl: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
        }),
      });

      const data = await res.json();
      document.body.removeChild(startMsg);

      if (data.success || data.message === "Song already downloaded") {
        const successMsg = document.createElement("div");
        successMsg.innerText = `Downloaded ${track.name}!`;
        successMsg.className = "fixed bottom-5 right-5 bg-green-600 text-white p-4 rounded-md z-50";
        document.body.appendChild(successMsg);
        setTimeout(() => document.body.removeChild(successMsg), 3000);
      } else {
        alert("Download failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      document.body.removeChild(startMsg);
      alert("Error downloading song");
      console.error(err);
    }
  };

  const handlePlayDownload = (track: any) => {
    // Construct the Supabase Public URL
    // NOTE: In a real app, we should check if it exists in DB first to get the real path.
    // For this demo, we assume the standard path format: user_id/spotify_id.mp3
    // But the frontend doesn't know the USER ID easily without a fetch.
    // So we'll try to Play, but we might need the URL from the download response or a lookup.
    
    // Actually, let's just trigger the download endpoint to get the metadata (it returns existing if found)
    // then play it.
    
    fetch("/api/download", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ trackId: track.id }),
    })
    .then(res => res.json())
    .then(data => {
       if (data.song) {
          const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/music/${data.song.storage_path}`;
          const event = new CustomEvent("play_track", {
            detail: {
              url: publicUrl,
              title: track.name,
              artist: track.artists.map((a: any) => a.name).join(", "),
              cover: track.album.images[0]?.url,
            },
          });
          window.dispatchEvent(event);
       } else {
         alert("Please download this song first!");
       }
    })
    .catch(err => console.error("Play error", err));
  };

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
              <th className="pb-3 w-12 text-right">Actions</th>
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
                     <div className="flex items-center justify-end gap-2">
                        <button
                          className="p-2 hover:text-green-400"
                          title="Play (if downloaded)"
                          onClick={() => handlePlayDownload(track)}
                        >
                          ▶
                        </button>
                        <button
                          className="p-2 hover:text-blue-400"
                          title="Download"
                          onClick={() => handleDownload(track)}
                        >
                          ⬇
                        </button>
                     </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
