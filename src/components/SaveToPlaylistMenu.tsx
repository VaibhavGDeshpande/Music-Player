"use client";

import { useEffect, useState, useRef } from "react";

interface SaveToPlaylistMenuProps {
  track: {
    id: string;
    name?: string;
    title?: string;
    artists?: { name: string }[];
    artist?: string;
    album?: { name?: string; images?: { url: string }[] };
    cover_url?: string;
    duration_ms?: number;
  };
  onClose: () => void;
}

export default function SaveToPlaylistMenu({ track, onClose }: SaveToPlaylistMenuProps) {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingTo, setSavingTo] = useState<string | null>(null);
  const [savedTo, setSavedTo] = useState<Set<string>>(new Set());
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/user-playlists")
      .then((res) => res.json())
      .then((data) => {
        if (data.playlists) setPlaylists(data.playlists);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const getSongData = () => ({
    spotify_id: track.id,
    title: track.name || track.title || "Unknown",
    artist: track.artists
      ? track.artists.map((a) => a.name).join(", ")
      : track.artist || "Unknown",
    album: track.album?.name || null,
    cover_url: track.album?.images?.[0]?.url || track.cover_url || null,
    duration_ms: track.duration_ms || null,
  });

  const handleAddToPlaylist = async (playlistId: string) => {
    setSavingTo(playlistId);
    try {
      const res = await fetch(`/api/user-playlists/${playlistId}/songs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getSongData()),
      });

      if (res.ok || res.status === 409) {
        setSavedTo((prev) => new Set(prev).add(playlistId));
      }
    } catch (err) {
      console.error("Error adding to playlist:", err);
    } finally {
      setSavingTo(null);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/user-playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (data.playlist) {
        setPlaylists((prev) => [data.playlist, ...prev]);
        setNewName("");
      }
    } catch (err) {
      console.error("Error creating playlist:", err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-1 z-50 w-64 bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-neutral-700">
        <p className="text-white text-sm font-semibold">Save to Playlist</p>
      </div>

      {/* Create new playlist */}
      <div className="px-3 py-2 border-b border-neutral-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New playlist name..."
            className="flex-1 bg-neutral-800 text-white text-sm px-3 py-1.5 rounded-md outline-none focus:ring-1 focus:ring-green-500"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="text-sm bg-green-500 text-black px-3 py-1.5 rounded-md font-semibold hover:bg-green-400 disabled:opacity-50 transition"
          >
            {creating ? "..." : "+"}
          </button>
        </div>
      </div>

      {/* Playlist list */}
      <div className="max-h-48 overflow-y-auto">
        {loading ? (
          <p className="text-neutral-400 text-sm px-4 py-3">Loading...</p>
        ) : playlists.length === 0 ? (
          <p className="text-neutral-400 text-sm px-4 py-3">No playlists yet. Create one above!</p>
        ) : (
          playlists.map((pl) => (
            <button
              key={pl.id}
              onClick={() => handleAddToPlaylist(pl.id)}
              disabled={savingTo === pl.id || savedTo.has(pl.id)}
              className="w-full text-left px-4 py-2.5 hover:bg-neutral-800 transition flex items-center justify-between"
            >
              <span className="text-white text-sm truncate">{pl.name}</span>
              {savedTo.has(pl.id) ? (
                <span className="text-green-500 text-sm">✔</span>
              ) : savingTo === pl.id ? (
                <span className="text-neutral-400 text-sm animate-pulse">...</span>
              ) : (
                <span className="text-neutral-400 text-sm">+</span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
