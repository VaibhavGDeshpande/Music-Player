"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check auth status, then redirect accordingly
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          router.push("/dashboard");
        } else {
          router.push("/login");
        }
      } catch {
        router.push("/login");
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-6 animate-fadeInUp">
        {/* Logo */}
        <div className="relative w-28 h-28 animate-scaleIn">
          <Image
            src="/music player logo.jpg"
            alt="MusicPlayer Logo"
            fill
            className="rounded-2xl shadow-2xl shadow-pink-500/20 object-cover"
            priority
          />
        </div>

        {/* App Name */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-pink-500 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              MusicPlayer
            </span>
          </h1>
          <p className="text-neutral-500 text-sm mt-2">Stream your downloads</p>
        </div>

        {/* Loading indicator */}
        <div className="flex items-center gap-1 mt-4">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" style={{ animationDelay: "0s" }} />
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" style={{ animationDelay: "0.2s" }} />
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" style={{ animationDelay: "0.4s" }} />
        </div>
      </div>
    </div>
  );
}
