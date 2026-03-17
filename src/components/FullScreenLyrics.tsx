"use client";

import { usePlayer } from "@/contexts/PlayerContext";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

type LyricLine = {
  startTimeMs: string;
  words: string;
};

export default function FullScreenLyrics() {
  const { currentTrack, currentTime, seek } = usePlayer();
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLParagraphElement>(null);
  const lastTrackIdRef = useRef<string | null>(null);

  // Fetch lyrics
  useEffect(() => {
    if (!currentTrack?.id || currentTrack.id === lastTrackIdRef.current) return;
    lastTrackIdRef.current = currentTrack.id;
    setLoading(true);
    setError(false);
    setLyrics([]);

    fetch(`/api/lyrics?trackid=${currentTrack.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error || !data.lines || data.lines.length === 0) {
          setError(true);
        } else {
          const filteredLines = data.lines.filter(
            (line: LyricLine) => line.words.trim() !== ""
          );
          setLyrics(filteredLines.length > 0 ? data.lines : []);
          if (filteredLines.length === 0) setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [currentTrack?.id, currentTrack?.title, currentTrack?.artist]);

  // Active line index
  const activeIndex = useMemo(() => {
    if (!lyrics.length) return -1;
    const ms = currentTime * 1000;
    let idx = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (parseInt(lyrics[i].startTimeMs) <= ms) idx = i;
      else break;
    }
    return idx;
  }, [lyrics, currentTime]);

  // Auto-scroll
  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeIndex]);

  if (!currentTrack) return null;

  return (
    <div
      className="flex-1 flex flex-col min-h-0 rounded-lg overflow-hidden relative"
      style={{
        background: "linear-gradient(180deg, rgba(60, 50, 30, 0.95) 0%, rgba(30, 25, 15, 0.98) 40%, rgba(18, 15, 10, 1) 100%)",
      }}
    >
      {/* Scrollable lyrics content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-8 md:px-12 lg:px-16 scroll-smooth"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, black 5%, black 90%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 5%, black 90%, transparent 100%)",
        }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-neutral-700" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-green-400 animate-spin" />
            </div>
            <p className="text-neutral-500 text-xs tracking-widest uppercase">Loading lyrics</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-neutral-500">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
            <p className="text-neutral-400 text-sm font-medium">No lyrics available</p>
            <p className="text-neutral-600 text-xs">Lyrics aren&apos;t available for this track yet</p>
          </div>
        ) : (
          <div className="py-20 space-y-3 max-w-3xl">
            {lyrics.map((line, index) => {
              const isActive = index === activeIndex;
              const isEmpty = line.words.trim() === "";

              if (isEmpty) return <div key={index} className="h-6" />;

              // Proximity-based opacity
              const distance = Math.abs(index - activeIndex);
              const proximityOpacity = isActive ? 1 : distance <= 1 ? 0.5 : distance <= 2 ? 0.3 : distance <= 4 ? 0.15 : 0.08;

              return (
                <p
                  key={index}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => seek(parseInt(line.startTimeMs) / 1000)}
                  className={`font-black cursor-pointer transition-all duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)] leading-[1.2] ${
                    isActive
                      ? "text-white text-[2rem] md:text-[2.4rem]"
                      : "text-white text-[1.5rem] md:text-[1.8rem]"
                  }`}
                  style={{
                    opacity: proximityOpacity,
                    transition: "all 0.7s cubic-bezier(0.25, 0.1, 0.25, 1), opacity 0.5s ease",
                  }}
                >
                  {line.words}
                </p>
              );
            })}
            <div className="h-48" />
          </div>
        )}
      </div>
    </div>
  );
}
