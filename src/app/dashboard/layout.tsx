import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-black overflow-hidden">
      <Sidebar />
      <main className="flex-1 bg-gradient-to-b from-neutral-800 to-black overflow-y-auto m-2 rounded-xl p-6 text-white">
        {children}
      </main>
    </div>
  );
}
