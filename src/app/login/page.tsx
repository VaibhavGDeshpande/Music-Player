"use client";

export default function LoginPage() {
  const handleLogin = () => {
    window.location.href = "/api/auth/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-neutral-900 p-10 rounded-xl shadow-xl text-center">
        <h1 className="text-3xl font-bold mb-6">
          Login with Spotify
        </h1>

        <button
          onClick={handleLogin}
          className="bg-green-500 hover:bg-green-600 text-black font-semibold px-6 py-3 rounded-full transition"
        >
          Continue with Spotify
        </button>
      </div>
    </div>
  );
}