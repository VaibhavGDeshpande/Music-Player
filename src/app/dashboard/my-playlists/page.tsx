"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function MyPlaylistsPage() {
  const router = useRouter();
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchPlaylists = () => {
    fetch("/api/user-playlists")
      .then((res) => res.json())
      .then((data) => {
        if (data.playlists) setPlaylists(data.playlists);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/user-playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || null }),
      });
      const data = await res.json();
      if (data.playlist) {
        setPlaylists((prev) => [data.playlist, ...prev]);
        setNewName("");
        setNewDesc("");
        setShowCreate(false);
      }
    } catch (err) {
      console.error("Failed to create playlist:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, playlistId: string) => {
    e.stopPropagation();
    if (!confirm("Delete this playlist?")) return;

    try {
      await fetch(`/api/user-playlists/${playlistId}`, { method: "DELETE" });
      setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
    } catch (err) {
      console.error("Failed to delete playlist:", err);
    }
  };

  if (loading) return <div className="text-white p-10">Loading playlists...</div>;

  return (
    <div className="text-white px-4 md:px-8 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pt-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-bold">My Playlists</h1>
          <p className="text-neutral-400 mt-2">{playlists.length} playlists</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-green-500 text-black font-bold px-6 py-2.5 rounded-full hover:bg-green-400 hover:scale-105 transition"
        >
          + Create
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-6 mb-8 max-w-md">
          <h3 className="text-lg font-semibold mb-4">New Playlist</h3>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Playlist name"
            className="w-full bg-neutral-800 text-white px-4 py-2.5 rounded-md outline-none focus:ring-2 focus:ring-green-500 mb-3"
            autoFocus
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full bg-neutral-800 text-white px-4 py-2.5 rounded-md outline-none focus:ring-2 focus:ring-green-500 mb-4"
          />
          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="bg-green-500 text-black font-bold px-6 py-2 rounded-full hover:bg-green-400 disabled:opacity-50 transition"
            >
              {creating ? "Creating..." : "Create"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="text-neutral-400 hover:text-white transition px-4"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Playlist Grid */}
      {playlists.length === 0 ? (
        <div className="text-neutral-400 text-center py-16">
          <p className="text-4xl mb-4">📁</p>
          <p>You haven't created any playlists yet.</p>
          <p className="text-sm mt-1">Click "+ Create" to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {playlists.map((playlist) => (
            <div
              key={playlist.id}
              onClick={() => router.push(`/dashboard/my-playlists/${playlist.id}`)}
              className="bg-neutral-900/40 hover:bg-neutral-800 p-4 rounded-lg transition-all cursor-pointer group hover:scale-[1.02] duration-300 relative"
            >
              <div className="relative mb-4 shadow-lg rounded-md overflow-hidden">
                <div className="w-full aspect-square bg-gradient-to-br from-indigo-600 to-purple-500 flex items-center justify-center">
                  <span className="text-5xl">🎵</span>
                </div>
              </div>
              <h3 className="font-bold truncate text-base mb-1">{playlist.name}</h3>
              <p className="text-xs text-neutral-400 truncate">
                {playlist.description || "No description"}
              </p>
              {/* Delete button */}
              <button
                onClick={(e) => handleDelete(e, playlist.id)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-red-400 hover:text-red-300 hover:bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-sm"
                title="Delete playlist"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
