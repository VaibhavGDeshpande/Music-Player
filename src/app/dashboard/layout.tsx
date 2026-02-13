import Sidebar from "@/components/Sidebar";
import Player from "@/components/Player";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden relative">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 bg-gradient-to-b from-neutral-800 to-black overflow-y-auto m-2 rounded-xl p-6 text-white pb-32">
          {children}
        </main>
      </div>
      <Player />
    </div>
  );
}
