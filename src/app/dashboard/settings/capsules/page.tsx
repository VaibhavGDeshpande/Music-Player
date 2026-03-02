"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AvailableMonth {
  month: number;
  year: number;
  label: string;
}

export default function CapsulesArchivePage() {
  const router = useRouter();
  const [months, setMonths] = useState<AvailableMonth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/capsule/available")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMonths(data);
        } else {
          console.error("Invalid response from available capsules API", data);
          setMonths([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching available capsules", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full text-white">
        <div className="w-10 h-10 border-3 border-neutral-600 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="text-white pb-32 px-4 md:px-8 pt-8 bg-gradient-to-b from-purple-900/20 to-black min-h-full">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-neutral-700 transition"
          >
            ←
          </button>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
            Sound Capsule Archive
          </h1>
        </div>

        {months.length === 0 ? (
          <div className="text-neutral-400 text-center py-12">
            No sound capsules available yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {months.map((m) => (
              <Link 
                key={`${m.year}-${m.month}`}
                href={`/dashboard/settings/capsule?month=${m.month}&year=${m.year}`}
                className="bg-neutral-900/50 p-6 rounded-2xl border border-white/5 backdrop-blur-sm hover:border-purple-500/50 hover:bg-neutral-800/50 transition-all group flex flex-col items-center justify-center aspect-square"
              >
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  💿
                </div>
                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-purple-400 transition-colors">
                  {m.label}
                </h3>
                <p className="text-sm text-neutral-500">View Capsule</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
