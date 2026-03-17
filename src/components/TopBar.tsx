"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) setUser(data);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-4 px-4 md:px-6 py-3 bg-transparent">
      {/* Left: navigation arrows */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="white"><path d="M11.03.47a.75.75 0 0 1 0 1.06L4.56 8l6.47 6.47a.75.75 0 1 1-1.06 1.06L2.44 8 9.97.47a.75.75 0 0 1 1.06 0z"/></svg>
        </button>
        <button
          onClick={() => window.history.forward()}
          className="w-8 h-8 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="white"><path d="M4.97.47a.75.75 0 0 0 0 1.06L11.44 8l-6.47 6.47a.75.75 0 1 0 1.06 1.06L13.56 8 6.03.47a.75.75 0 0 0-1.06 0z"/></svg>
        </button>
      </div>

      {/* Center: search bar (only on certain pages, or always like Spotify) */}
      {pathname !== "/dashboard/search" && (
        <div
          className="hidden md:flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700/80 rounded-full px-4 py-2.5 cursor-pointer transition-colors max-w-md w-full mx-auto"
          onClick={() => router.push("/dashboard/search")}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-neutral-400 flex-shrink-0">
            <path d="M7 1.75a5.25 5.25 0 1 0 0 10.5 5.25 5.25 0 0 0 0-10.5zM.25 7a6.75 6.75 0 1 1 12.096 4.12l3.184 3.185a.75.75 0 1 1-1.06 1.06L11.285 12.18A6.75 6.75 0 0 1 .25 7z"/>
          </svg>
          <span className="text-sm text-neutral-400">What do you want to play?</span>
        </div>
      )}

      {/* Right: profile */}
      <div className="relative flex items-center gap-3">
        <Link
          href="/dashboard/settings"
          className="w-8 h-8 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors text-neutral-400 hover:text-white"
          title="Settings"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm7.43-2.53c.04-.32.07-.64.07-.97s-.03-.66-.07-.97l2.11-1.66c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.66c-.04.32-.07.65-.07.97s.03.66.07.97l-2.11 1.66c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66z"/></svg>
        </Link>

        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 bg-black/60 hover:bg-black/80 rounded-full p-0.5 pr-2 transition-colors"
        >
          {user?.profile_image_url ? (
            <img
              src={user.profile_image_url}
              alt={user.display_name || "Profile"}
              className="w-7 h-7 rounded-full object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-neutral-700 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-neutral-300"><path d="M6.233.371a4.388 4.388 0 0 1 5.002 1.052c.421.459.713.992.904 1.554.143.421.263 1.173.22 1.894-.078 1.322-.638 2.408-1.399 3.316l-.127.152a.75.75 0 0 0 .201 1.13l2.209 1.275a4.75 4.75 0 0 1 2.375 4.114V16H.382v-1.143a4.75 4.75 0 0 1 2.375-4.113l2.209-1.275a.75.75 0 0 0 .201-1.13l-.127-.153c-.761-.908-1.322-1.994-1.399-3.316-.043-.721.077-1.473.22-1.894a4.388 4.388 0 0 1 2.372-2.605z"/></svg>
            </div>
          )}
          <svg width="12" height="12" viewBox="0 0 16 16" fill="white" className="opacity-70"><path d="M3 6l5 5.794L13 6z"/></svg>
        </button>

        {/* Dropdown */}
        {showDropdown && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
            <div className="absolute right-0 top-full mt-1 bg-neutral-800 rounded-md shadow-xl border border-neutral-700 py-1 min-w-[180px] z-50 animate-fadeIn">
              {user && (
                <div className="px-3 py-2 border-b border-neutral-700">
                  <p className="text-sm font-bold text-white truncate">{user.display_name}</p>
                  <p className="text-xs text-neutral-400 truncate">{user.email}</p>
                </div>
              )}
              <Link
                href="/dashboard/settings"
                className="block px-3 py-2 text-sm text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors"
                onClick={() => setShowDropdown(false)}
              >
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-sm text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors border-t border-neutral-700"
              >
                Log out
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
