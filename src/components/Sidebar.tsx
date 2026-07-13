"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "playlists" | "albums">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    fetch("/api/playlists")
      .then((res) => res.json())
      .then((data) => {
        if (data.items) setPlaylists(data.items);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const filteredPlaylists = playlists.filter((p) => {
    if (searchQuery) {
      return p.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const navLinks = [
    { href: "/dashboard", label: "Home", icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 3.247a1 1 0 0 0-1 0L4 7.577V20h4.5v-6a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v6H20V7.577l-7.5-4.33zm-2-1.732a3 3 0 0 1 3 0l7.5 4.33a2 2 0 0 1 1 1.732V21a1 1 0 0 1-1 1h-6.5a1 1 0 0 1-1-1v-6h-3v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.577a2 2 0 0 1 1-1.732l7.5-4.33z"/></svg>
    )},
    { href: "/dashboard/search", label: "Search", icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M10.533 1.279c-5.18 0-9.407 4.14-9.407 9.279s4.226 9.279 9.407 9.279c2.234 0 4.29-.77 5.907-2.058l4.353 4.353a1 1 0 1 0 1.414-1.414l-4.344-4.344a9.157 9.157 0 0 0 2.077-5.816c0-5.14-4.226-9.28-9.407-9.28zm-7.407 9.279c0-4.006 3.302-7.28 7.407-7.28s7.407 3.274 7.407 7.28-3.302 7.279-7.407 7.279-7.407-3.273-7.407-7.28z"/></svg>
    )},
  ];

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <div className="hidden md:flex w-[280px] flex-col h-full gap-2 flex-shrink-0">

        {/* Top nav section */}
        <div className="bg-neutral-950 rounded-lg px-3 py-3">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-5 px-3 py-2.5 rounded-md transition-all duration-200 group ${
                  isActive
                    ? "text-white font-bold"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <span className={`transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-105"}`}>
                  {link.icon}
                </span>
                <span className="text-sm font-semibold">{link.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Library section */}
        <div className="bg-neutral-950 rounded-lg flex-1 flex flex-col min-h-0">
          {/* Library header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <button className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors group">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="transition-transform group-hover:scale-105">
                <path d="M3 22a1 1 0 0 1-1-1V3a1 1 0 0 1 2 0v18a1 1 0 0 1-1 1zM15.5 2.134A1 1 0 0 0 14 3v18a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V6.464a1 1 0 0 0-.5-.866l-6-3.464zM9 2a1 1 0 0 0-1 1v18a1 1 0 1 0 2 0V3a1 1 0 0 0-1-1z"/>
              </svg>
              <span className="text-sm font-bold">Your Library</span>
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={() => router.push("/dashboard/my-playlists")}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all"
                title="Create"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M15.25 8a.75.75 0 0 1-.75.75H8.75v5.75a.75.75 0 0 1-1.5 0V8.75H1.5a.75.75 0 0 1 0-1.5h5.75V1.5a.75.75 0 0 1 1.5 0v5.75h5.75a.75.75 0 0 1 .75.75z"/></svg>
              </button>
            </div>
          </div>

          {/* Filter pills */}
          <div className="flex gap-2 px-4 py-2">
            {(["all", "playlists", "albums"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
                  filter === f
                    ? "bg-white text-black"
                    : "bg-neutral-800 text-white hover:bg-neutral-700"
                }`}
              >
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Search + Sort row */}
          <div className="flex items-center justify-between px-4 py-1.5">
            {showSearch ? (
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search in Your Library"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={() => { if (!searchQuery) setShowSearch(false); }}
                  autoFocus
                  className="w-full bg-neutral-800 text-white text-xs px-3 py-1.5 rounded-md placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-600"
                />
              </div>
            ) : (
              <button
                onClick={() => setShowSearch(true)}
                className="text-neutral-400 hover:text-white transition-colors p-1"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M7 1.75a5.25 5.25 0 1 0 0 10.5 5.25 5.25 0 0 0 0-10.5zM.25 7a6.75 6.75 0 1 1 12.096 4.12l3.184 3.185a.75.75 0 1 1-1.06 1.06L11.285 12.18A6.75 6.75 0 0 1 .25 7z"/></svg>
              </button>
            )}
            <button className="text-neutral-400 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors">
              Recents
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M15 14.5H5V13h10v1.5zm0-5.75H5v-1.5h10v1.5zM15 3H5V1.5h10V3zM3 3H1V1.5h2V3zm0 11.5H1V13h2v1.5zm0-5.75H1v-1.5h2v1.5z"/></svg>
            </button>
          </div>

          {/* Playlist list */}
          <div className="flex-1 overflow-y-auto px-2 pb-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
            {/* Fixed items: Liked Songs, My Songs */}
            <Link
              href="/dashboard/library"
              className={`flex items-center gap-3 p-2 rounded-md transition-all hover:bg-neutral-800 ${pathname === "/dashboard/library" ? "bg-neutral-800" : ""}`}
            >
              <div className="w-12 h-12 rounded-md bg-gradient-to-br from-purple-700 to-blue-200 flex items-center justify-center flex-shrink-0 shadow-md">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">Liked Songs</p>
                <p className="text-xs text-neutral-400 truncate">Playlist</p>
              </div>
            </Link>

            <Link
              href="/dashboard/my-songs"
              className={`flex items-center gap-3 p-2 rounded-md transition-all hover:bg-neutral-800 ${pathname === "/dashboard/my-songs" ? "bg-neutral-800" : ""}`}
            >
              <div className="w-12 h-12 rounded-md bg-gradient-to-br from-green-600 to-green-900 flex items-center justify-center flex-shrink-0 shadow-md">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">My Songs</p>
                <p className="text-xs text-neutral-400 truncate">Downloaded</p>
              </div>
            </Link>

            {/* User playlists */}
            {filteredPlaylists.map((playlist) => (
              <Link
                key={playlist.id}
                href={`/dashboard/playlists/${playlist.id}`}
                className={`flex items-center gap-3 p-2 rounded-md transition-all hover:bg-neutral-800 ${pathname === `/dashboard/playlists/${playlist.id}` ? "bg-neutral-800" : ""}`}
              >
                <img
                  src={playlist.images?.[0]?.url || "/placeholder.svg"}
                  alt={playlist.name}
                  className="w-12 h-12 rounded-md object-cover flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{playlist.name}</p>
                  <p className="text-xs text-neutral-400 truncate">
                    Playlist • {playlist.owner?.display_name}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-lg border-t border-neutral-800 flex justify-around py-3 z-50">
        {[
          { href: "/dashboard", label: "Home", icon: "🏠" },
          { href: "/dashboard/search", label: "Search", icon: "🔍" },
          { href: "/dashboard/library", label: "Library", icon: "📚" },
          { href: "/dashboard/my-songs", label: "My Songs", icon: "📥" },
          { href: "/dashboard/playlists", label: "Playlists", icon: "🎵" },
        ].map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center text-xs transition-all duration-200 ${
                isActive ? "text-white" : "text-neutral-400"
              }`}
            >
              <span className="text-lg mb-0.5">{link.icon}</span>
              {link.label}
              {isActive && <div className="w-1 h-1 bg-white rounded-full mt-0.5" />}
            </Link>
          );
        })}
      </div>
    </>
  );
}