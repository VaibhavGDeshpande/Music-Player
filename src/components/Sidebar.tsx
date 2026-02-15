"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const links = [
    { href: "/dashboard", label: "Home", icon: "🏠" },
    { href: "/dashboard/search", label: "Search", icon: "🔍" },
    { href: "/dashboard/library", label: "Liked Songs", icon: "❤️" },
    { href: "/dashboard/my-songs", label: "My Songs", icon: "🎵" },
    { href: "/dashboard/my-playlists", label: "My Playlists", icon: "📁" },
  ];

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <div className="hidden md:flex w-64 bg-black h-full flex-col p-6 text-neutral-400">
        <div className="text-white text-2xl font-bold mb-8 px-2">
          MusicPlayer
        </div>

        <nav className="flex-1 space-y-4">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-4 px-2 py-2 rounded-md transition ${
                  isActive
                    ? "bg-neutral-800 text-white font-semibold"
                    : "hover:bg-neutral-800 hover:text-white"
                }`}
              >
                <span className="text-xl">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-neutral-800 pt-4 space-y-2">
          <Link
            href="/dashboard/settings"
            className={`flex items-center gap-4 px-2 py-2 rounded-md transition ${
              pathname === "/dashboard/settings"
                ? "bg-neutral-800 text-white font-semibold"
                : "hover:bg-neutral-800 hover:text-white"
            }`}
          >
            <span className="text-xl">⚙️</span>
            <span>Settings</span>
          </Link>
        </div>
      </div>

      {/* MOBILE BOTTOM NAV (Spotify style) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-neutral-800 flex justify-around py-3 z-50">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center text-xs ${
                isActive ? "text-white" : "text-neutral-400"
              }`}
            >
              <span className="text-lg">{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
        <Link
          href="/dashboard/settings"
          className={`flex flex-col items-center text-xs ${
            pathname === "/dashboard/settings" ? "text-white" : "text-neutral-400"
          }`}
        >
          <span className="text-lg">⚙️</span>
          Settings
        </Link>
      </div>
    </>
  );
}