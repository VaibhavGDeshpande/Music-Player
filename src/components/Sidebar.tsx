"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: "Home", icon: "🏠" },
    { href: "/dashboard/search", label: "Search", icon: "🔍" },
    { href: "/dashboard/library", label: "Your Library", icon: "📚" },
  ];

  return (
    <div className="w-64 bg-black h-screen flex flex-col p-6 text-neutral-400">
      <div className="text-white text-2xl font-bold mb-8 px-2">MusicPlayer</div>
      <nav className="flex-1 space-y-4">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-4 px-2 py-2 transition ${
                isActive ? "text-white font-bold" : "hover:text-white"
              }`}
            >
              <span className="text-2xl">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-neutral-800 pt-4 mt-auto">
        <div className="px-2 py-2 hover:text-white cursor-pointer flex items-center gap-4">
          <span className="bg-white text-black p-1 rounded-sm">➕</span>
          <span>Create Playlist</span>
        </div>
        <div className="px-2 py-2 hover:text-white cursor-pointer flex items-center gap-4">
          <span className="bg-gradient-to-br from-indigo-700 to-green-300 p-1 rounded-sm text-white">❤️</span>
          <span>Liked Songs</span>
        </div>
      </div>
    </div>
  );
}
