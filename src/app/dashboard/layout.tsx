"use client";

import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import NowPlayingPanel from "@/components/NowPlayingPanel";
import FullScreenLyrics from "@/components/FullScreenLyrics";
import Player from "@/components/Player";
import { PlayerProvider, usePlayer } from "@/contexts/PlayerContext";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { currentTrack, showDesktopLyrics } = usePlayer();

  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden relative">
      <div className="flex flex-1 overflow-hidden gap-2 p-2 pb-0">
        <Sidebar />

        {/* Main content area — shows lyrics or page content */}
        {showDesktopLyrics && currentTrack ? (
          <FullScreenLyrics />
        ) : (
          <main className="flex-1 bg-gradient-to-b from-neutral-900 to-neutral-950 overflow-y-auto text-white rounded-lg pb-24">
            <TopBar />
            {children}
          </main>
        )}

        {/* Right panel — Now Playing */}
        {currentTrack && <NowPlayingPanel />}
      </div>
      <Player />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PlayerProvider>
      <DashboardContent>{children}</DashboardContent>
    </PlayerProvider>
  );
}
