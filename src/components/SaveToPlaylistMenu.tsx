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
      className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.6)] border border-white/8 animate-menuIn"
      style={{ background: "rgba(18, 18, 18, 0.95)", backdropFilter: "blur(24px)" }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-md bg-green-500/15 flex items-center justify-center flex-shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-green-400">
            <path d="M14 10H2v2h12v-2zm0-4H2v2h12V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM2 16h8v-2H2v2z"/>
          </svg>
        </div>
        <p className="text-white text-sm font-semibold tracking-tight">Add to Playlist</p>
      </div>

      {/* Create new playlist */}
      <div className="px-3 py-2.5 border-b border-white/6">
        <div className="flex gap-1.5">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New playlist name..."
            className="flex-1 bg-white/6 hover:bg-white/8 focus:bg-white/10 text-white text-sm px-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-green-500/50 placeholder-neutral-600 transition-colors"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="flex items-center justify-center w-9 h-9 bg-green-500 hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-black transition-all active:scale-95 flex-shrink-0"
            title="Create playlist"
          >
            {creating ? (
              <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Playlist list */}
      <div className="max-h-52 overflow-y-auto overscroll-contain">
        {loading ? (
          <div className="flex items-center justify-center py-6 gap-2">
            <div className="w-4 h-4 border-2 border-neutral-700 border-t-green-500 rounded-full animate-spin" />
            <p className="text-neutral-500 text-xs">Loading playlists...</p>
          </div>
        ) : playlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 gap-1 px-4 text-center">
            <p className="text-neutral-400 text-sm font-medium">No playlists yet</p>
            <p className="text-neutral-600 text-xs">Create one above to get started</p>
          </div>
        ) : (
          playlists.map((pl) => {
            const isSaved = savedTo.has(pl.id);
            const isSaving = savingTo === pl.id;
            return (
              <button
                key={pl.id}
                onClick={() => handleAddToPlaylist(pl.id)}
                disabled={isSaving || isSaved}
                className={`w-full text-left px-4 py-2.5 transition-colors flex items-center justify-between gap-3 group ${
                  isSaved
                    ? "bg-green-500/8 cursor-default"
                    : "hover:bg-white/6 active:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Playlist icon */}
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${isSaved ? "bg-green-500/20" : "bg-white/6 group-hover:bg-white/10"}`}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className={isSaved ? "text-green-400" : "text-neutral-400"}>
                      <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
                    </svg>
                  </div>
                  <span className={`text-sm truncate font-medium ${isSaved ? "text-green-400" : "text-white"}`}>
                    {pl.name}
                  </span>
                </div>

                {/* Status indicator */}
                {isSaved ? (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-green-400">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  </div>
                ) : isSaving ? (
                  <div className="w-3.5 h-3.5 border-2 border-neutral-700 border-t-green-400 rounded-full animate-spin flex-shrink-0" />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-neutral-600 group-hover:text-neutral-300 transition-colors flex-shrink-0">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Animation */}
      <style jsx>{`
        @keyframes menuIn {
          from { opacity: 0; transform: scale(0.95) translateY(-6px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        .animate-menuIn {
          animation: menuIn 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
}
