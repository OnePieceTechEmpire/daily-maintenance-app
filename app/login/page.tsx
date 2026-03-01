"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) return alert(error.message);
    router.push("/projects");
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-5">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md bg-white border border-gray-200 shadow-sm rounded-2xl p-6"
      >
        <h1 className="text-2xl font-bold text-gray-800">Login</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back.</p>

        <div className="mt-5 space-y-3">
          <input
            type="email"
            required
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-400 outline-none"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            required
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-400 outline-none"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          disabled={loading}
          className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl active:scale-95 transition disabled:opacity-60"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/register")}
          className="mt-3 w-full py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50"
        >
          Create new account
        </button>
      </form>
    </div>
  );
}