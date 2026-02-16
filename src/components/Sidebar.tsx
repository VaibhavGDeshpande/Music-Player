"use client";

import Link from "next/link";
import Image from "next/image";
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
        <div className="flex items-center gap-3 mb-8 px-2 animate-fadeIn">
          <Image
            src="/music player logo.jpg"
            alt="MusicPlayer"
            width={36}
            height={36}
            className="rounded-lg shadow-lg"
          />
          <span className="text-xl font-bold">
            <span className="bg-gradient-to-r from-pink-500 to-cyan-400 bg-clip-text text-transparent">
              Music
            </span>
            <span className="text-white">Player</span>
          </span>
        </div>

        <nav className="flex-1 space-y-1">
          {links.map((link, index) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-4 px-3 py-2.5 rounded-lg transition-all duration-200 group animate-staggerFadeIn stagger-${index + 1} ${
                  isActive
                    ? "bg-neutral-800 text-white font-semibold"
                    : "hover:bg-neutral-800/60 hover:text-white"
                }`}
              >
                <span className={`text-xl transition-transform duration-200 group-hover:scale-110 ${isActive ? "scale-110" : ""}`}>
                  {link.icon}
                </span>
                <span className="transition-all duration-200 group-hover:translate-x-0.5">
                  {link.label}
                </span>
                {isActive && (
                  <div className="ml-auto w-1 h-4 bg-green-500 rounded-full animate-fadeIn" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-neutral-800 pt-4 space-y-2">
          <Link
            href="/dashboard/settings"
            className={`flex items-center gap-4 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
              pathname === "/dashboard/settings"
                ? "bg-neutral-800 text-white font-semibold"
                : "hover:bg-neutral-800/60 hover:text-white"
            }`}
          >
            <span className="text-xl transition-transform duration-200 group-hover:rotate-90">⚙️</span>
            <span className="transition-all duration-200 group-hover:translate-x-0.5">Settings</span>
          </Link>
        </div>
      </div>

      {/* MOBILE BOTTOM NAV (Spotify style) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-lg border-t border-neutral-800 flex justify-around py-3 z-50">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center text-xs transition-all duration-200 ${
                isActive ? "text-white scale-105" : "text-neutral-400 active:scale-95"
              }`}
            >
              <span className={`text-lg mb-0.5 transition-transform duration-200 ${isActive ? "scale-110" : ""}`}>
                {link.icon}
              </span>
              {link.label}
              {isActive && (
                <div className="w-1 h-1 bg-green-500 rounded-full mt-0.5 animate-fadeIn" />
              )}
            </Link>
          );
        })}
        <Link
          href="/dashboard/settings"
          className={`flex flex-col items-center text-xs transition-all duration-200 ${
            pathname === "/dashboard/settings" ? "text-white scale-105" : "text-neutral-400 active:scale-95"
          }`}
        >
          <span className="text-lg mb-0.5">⚙️</span>
          Settings
        </Link>
      </div>
    </>
  );
}