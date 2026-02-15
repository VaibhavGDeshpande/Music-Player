import Sidebar from "@/components/Sidebar";
import Player from "@/components/Player";
import { PlayerProvider } from "@/contexts/PlayerContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PlayerProvider>
      <div className="flex flex-col h-screen bg-black overflow-hidden relative">
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 bg-gradient-to-b from-neutral-800 to-black overflow-y-auto text-white pb-32">
            {children}
          </main>
        </div>
        <Player />
      </div>
    </PlayerProvider>
  );
}
