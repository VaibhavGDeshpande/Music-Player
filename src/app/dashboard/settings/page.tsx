"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface UserProfile {
  display_name: string;
  email: string;
  country: string;
  product_type: string;
  profile_image_url: string;
  spotify_user_id: string;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/me")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed to fetch profile");
      })
      .then((data) => {
        setProfile(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (loading) {
    return <div className="p-8 text-neutral-400">Loading settings...</div>;
  }

  if (!profile) {
    return <div className="p-8 text-red-500">Failed to load profile.</div>;
  }

  return (
    <div className="flex-1 bg-gradient-to-b from-neutral-800 to-black p-4 md:p-8 overflow-y-auto pb-32">
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-6 md:mb-8">Settings</h1>

      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-10 text-center md:text-left">
        <img
          src={profile.profile_image_url || "/placeholder.png"}
          alt={profile.display_name}
          className="w-32 h-32 rounded-full shadow-lg object-cover border-4 border-neutral-700"
        />
        <div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {profile.display_name}
          </h2>
          <p className="text-neutral-400 text-base md:text-lg uppercase tracking-wider font-semibold">
            {profile.product_type} Plan
          </p>
        </div>
      </div>

      <div className="bg-neutral-900/50 rounded-xl p-4 md:p-6 backdrop-blur-sm border border-neutral-800 max-w-2xl mx-auto md:mx-0">
        <h3 className="text-lg md:text-xl font-bold text-white mb-6 border-b border-neutral-800 pb-4">
          Account Details
        </h3>
        
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-1 group">
            <span className="text-neutral-400">Email</span>
            <span className="text-white font-medium break-all">{profile.email}</span>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-1 group">
             <span className="text-neutral-400">Country</span>
             <span className="text-white font-medium flex items-center gap-2">
               {profile.country} 
               <span className="text-xl">🌍</span>
             </span>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-1 group">
             <span className="text-neutral-400">Spotify ID</span>
             <span className="text-neutral-500 font-mono text-xs md:text-sm bg-neutral-950 px-2 py-1 rounded break-all">
               {profile.spotify_user_id}
             </span>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center md:text-left">
        <button
          onClick={handleLogout}
          className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full transition transform hover:scale-105"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
