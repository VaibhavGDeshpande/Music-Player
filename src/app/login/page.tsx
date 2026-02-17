"use client";

import Image from "next/image";

export default function LoginPage() {
  const handleLogin = () => {
    window.location.href = "/api/auth/login";
  };

  return (
    <div className="login-page relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-20 blur-3xl"
          style={{
            background: "radial-gradient(circle, #1DB954, transparent 70%)",
            top: "-10%",
            left: "-10%",
            animation: "float 8s ease-in-out infinite",
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-15 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, #b026ff, transparent 70%)",
            bottom: "-15%",
            right: "-10%",
            animation: "float 10s ease-in-out infinite reverse",
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-10 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, #1e90ff, transparent 70%)",
            top: "40%",
            right: "20%",
            animation: "float 12s ease-in-out infinite 2s",
          }}
        />
      </div>

      {/* Main card */}
      <div
        className="relative z-10 w-full max-w-md mx-4 animate-scaleIn"
      >
        {/* Glass card */}
        <div
          className="rounded-3xl p-10 text-center"
          style={{
            background: "rgba(24, 24, 24, 0.65)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow:
              "0 32px 64px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          {/* Logo */}
          <div className="relative w-24 h-24 mx-auto mb-6 animate-fadeInUp">
            <Image
              src="/music player logo.jpg"
              alt="MusicPlayer"
              fill
              className="rounded-2xl shadow-2xl shadow-green-500/20 object-cover"
              priority
            />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold mb-2 animate-fadeInUp stagger-2">
            <span className="bg-gradient-to-r from-green-400 via-emerald-300 to-cyan-400 bg-clip-text text-transparent">
              MusicPlayer
            </span>
          </h1>
          <p className="text-neutral-400 text-sm mb-8 animate-fadeInUp stagger-3">
            Stream your downloads. Anytime, anywhere.
          </p>

          {/* Spotify login button */}
          <button
            onClick={handleLogin}
            className="login-glow-btn w-full flex items-center justify-center gap-3 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-base px-6 py-4 rounded-full transition-all duration-300 animate-fadeInUp stagger-4"
          >
            {/* Spotify icon */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
            Continue with Spotify
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8 animate-fadeIn stagger-5">
            <div className="flex-1 h-px bg-neutral-700/50" />
            <span className="text-neutral-500 text-xs uppercase tracking-widest">
              What you get
            </span>
            <div className="flex-1 h-px bg-neutral-700/50" />
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/5 rounded-xl p-4 text-center hover-lift animate-fadeInUp stagger-6">
              <div className="text-2xl mb-2">🎵</div>
              <p className="text-xs text-neutral-300 font-medium">
                Playlists
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center hover-lift animate-fadeInUp stagger-7">
              <div className="text-2xl mb-2">📝</div>
              <p className="text-xs text-neutral-300 font-medium">
                Lyrics
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center hover-lift animate-fadeInUp stagger-8">
              <div className="text-2xl mb-2">⬇️</div>
              <p className="text-xs text-neutral-300 font-medium">
                Downloads
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-neutral-600 text-xs mt-6 animate-fadeIn stagger-9">
          By continuing, you agree to MusicPlayer&apos;s Terms of Service.
        </p>
      </div>
    </div>
  );
}