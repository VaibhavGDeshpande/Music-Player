"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Profile {
  id: string;
  display_name: string;
  email: string;
  profile_image_url: string;
  country: string;
  product_type: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<Profile | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/me")
      .then(async (res) => {
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        setUser(data);
      })
      .catch(() => router.push("/login"));
  }, [router]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-10">
      <div className="max-w-md mx-auto bg-neutral-900 rounded-xl p-8 shadow-xl text-center">
        <img
          src={user.profile_image_url}
          alt="Profile"
          className="w-32 h-32 rounded-full mx-auto mb-6"
        />

        <h1 className="text-2xl font-bold mb-2">
          {user.display_name}
        </h1>

        <p className="text-neutral-400 mb-2">{user.email}</p>
        <p className="text-neutral-400 mb-2">
          Country: {user.country}
        </p>
        <p className="text-green-400 font-semibold">
          {user.product_type.toUpperCase()}
        </p>

        <button
          onClick={() => router.push("/dashboard")}
          className="mt-6 bg-green-500 text-black px-5 py-2 rounded-full hover:bg-green-600"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}