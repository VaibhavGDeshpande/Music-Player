"use client";

import { useEffect, useState, useRef } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import SongRow from "@/components/SongRow";

export const dynamic = "force-dynamic";

export default function MySongsPage() {
  const { mySongsCache, refreshMySongsCache } = usePlayer();
  const [songs, setSongs] = useState<any[]>(mySongsCache || []);
  const [loading, setLoading] = useState(mySongsCache === null);

  // Upload modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Helper to extract audio duration using browser Audio object
  const getAudioDuration = (audioFile: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      const objectUrl = URL.createObjectURL(audioFile);
      audio.src = objectUrl;
      audio.onloadedmetadata = () => {
        resolve(Math.round(audio.duration * 1000));
        URL.revokeObjectURL(objectUrl);
      };
      audio.onerror = () => {
        resolve(0);
        URL.revokeObjectURL(objectUrl);
      };
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      if (selectedFile.type.startsWith("audio/")) {
        setFile(selectedFile);
        // Autofill title from filename (removing extension)
        const nameWithoutExt = selectedFile.name.substring(0, selectedFile.name.lastIndexOf(".")) || selectedFile.name;
        setTitle(nameWithoutExt);
      } else {
        setUploadError("Please drop an audio file.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      const nameWithoutExt = selectedFile.name.substring(0, selectedFile.name.lastIndexOf(".")) || selectedFile.name;
      setTitle(nameWithoutExt);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title || !artist) {
      setUploadError("Please fill in all required fields (file, title, artist).");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      // Calculate duration first
      const durationMs = await getAudioDuration(file);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      formData.append("artist", artist);
      formData.append("album", album);
      formData.append("duration_ms", durationMs.toString());

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to upload song.");
      }

      // Success
      setIsModalOpen(false);
      setFile(null);
      setTitle("");
      setArtist("");
      setAlbum("");
      
      // Refresh list
      const updatedSongs = await refreshMySongsCache();
      setSongs(updatedSongs);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "An unexpected error occurred.");
    } finally {
      setUploading(false);
    }
  };

  if (loading)
    return <div className="text-white p-10">Loading your library...</div>;

  // Normalize local DB songs to SongRow-compatible format
  const normalizedSongs = songs.map((s) => ({
    id: s.spotify_id || s.id,
    name: s.title,
    artists: [{ name: s.artist }],
    album: { name: s.album || "Unknown", images: [{ url: s.cover_url || "" }, { url: s.cover_url || "" }, { url: s.cover_url || "" }] },
    duration_ms: s.duration_ms || 0,
    added_at: s.created_at,
    cover_url: s.cover_url || null,
    storage_path: s.storage_path,
    external_urls: { spotify: `https://open.spotify.com/track/${s.spotify_id || s.id}` },
  }));

  return (
    <div className="text-white px-4 md:px-8 pb-32">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-6 mb-10 text-center md:text-left pt-6">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
          <div className="w-40 h-40 md:w-52 md:h-52 bg-gradient-to-br from-emerald-600 to-cyan-400 flex items-center justify-center shadow-2xl rounded-md relative group overflow-hidden">
            <span className="text-5xl md:text-6xl transition-transform group-hover:scale-110 duration-300">🎵</span>
          </div>
          <div>
            <p className="text-xs md:text-sm font-bold uppercase mb-2 text-emerald-400 tracking-wider">Library</p>
            <h1 className="text-3xl md:text-6xl font-bold mb-3">My Songs</h1>
            <p className="text-sm text-neutral-400">
              {songs.length} downloaded & uploaded songs
            </p>
          </div>
        </div>

        {/* UPLOAD TRIGGER */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-6 py-3 rounded-full shadow-lg hover:shadow-emerald-500/25 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
        >
          <span>📤</span>
          <span>Upload Custom Song</span>
        </button>
      </div>

      {songs.length === 0 ? (
        <div className="text-neutral-400 text-center py-20 bg-neutral-900/20 rounded-lg border border-neutral-800">
          <p className="text-lg mb-4">You haven&apos;t added any songs yet.</p>
          <p className="text-sm text-neutral-500 mb-6">Go to a playlist and click the download button, or upload your own files!</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-neutral-800 hover:bg-neutral-700 text-white font-medium px-5 py-2.5 rounded-full transition-colors cursor-pointer"
          >
            Upload a song now
          </button>
        </div>
      ) : (
        <>
          {/* DESKTOP TABLE */}
          <div className="hidden md:block bg-black/20 p-6 rounded-md overflow-hidden border border-neutral-900">
            <table className="w-full text-left text-neutral-400 text-sm">
                <thead className="border-b border-neutral-800 uppercase text-xs tracking-wider text-neutral-500">
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
          <div className="md:hidden bg-black/20 p-3 rounded-md border border-neutral-900">
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

      {/* UPLOAD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity"
            onClick={() => !uploading && setIsModalOpen(false)}
          />

          {/* Modal Container */}
          <div className="bg-neutral-950/90 border border-neutral-800 rounded-2xl max-w-md w-full p-6 relative shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200 text-white">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Upload Custom Song</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                disabled={uploading}
                className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Drag and Drop Box */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
                  dragActive 
                    ? "border-emerald-500 bg-emerald-500/10" 
                    : file 
                    ? "border-emerald-500/50 bg-emerald-500/5" 
                    : "border-neutral-800 hover:border-neutral-700 bg-neutral-900/30"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                {file ? (
                  <div className="space-y-2">
                    <span className="text-3xl">🎵</span>
                    <p className="text-sm font-semibold text-emerald-400 truncate max-w-xs mx-auto">
                      {file.name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB • Click to change
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <span className="text-3xl text-neutral-500 block">📥</span>
                    <p className="text-sm font-medium">
                      Drag & drop your audio file here, or <span className="text-emerald-400 hover:underline">browse</span>
                    </p>
                    <p className="text-xs text-neutral-500">
                      Supports MP3, WAV, M4A, etc.
                    </p>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Song title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={uploading}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Artist */}
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                  Artist <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Artist name"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  disabled={uploading}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Album */}
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                  Album (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Album name"
                  value={album}
                  onChange={(e) => setAlbum(e.target.value)}
                  disabled={uploading}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {uploadError && (
                <p className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg p-3">
                  {uploadError}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={uploading}
                  className="w-1/2 bg-neutral-900 hover:bg-neutral-800 text-white font-medium py-2.5 rounded-lg border border-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !file || !title || !artist}
                  className="w-1/2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold py-2.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:hover:bg-emerald-500 disabled:cursor-not-allowed cursor-pointer text-sm flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <span>Upload Song</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}