"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("Malaysia");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      return alert(error.message);
    }

    const user = data.user;
    if (user) {
      // Create profile row
      const { error: profileErr } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: fullName || null,
        company_name: companyName || null,
        country: country || null,
        role: "owner",
      });

      if (profileErr) {
        console.error(profileErr);
        // Not fatal, but good to know
      }
    }

    setLoading(false);
    router.push("/projects");
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-5">
      <form
        onSubmit={handleRegister}
        className="w-full max-w-md bg-white border border-gray-200 shadow-sm rounded-2xl p-6"
      >
        <h1 className="text-2xl font-bold text-gray-800">Create account</h1>
        <p className="text-sm text-gray-500 mt-1">Email + password login.</p>

        <div className="mt-5 space-y-3">
          <input
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-400 outline-none"
            placeholder="Full name (optional)"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <input
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-400 outline-none"
            placeholder="Company (optional)"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
          <select
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-400 outline-none bg-white"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            <option>Malaysia</option>
            <option>Singapore</option>
            <option>Indonesia</option>
            <option>Thailand</option>
            <option>United Kingdom</option>
            <option>United States</option>
            <option>Australia</option>
            <option>Other</option>
          </select>

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
            placeholder="Password (min 6)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          disabled={loading}
          className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl active:scale-95 transition disabled:opacity-60"
        >
          {loading ? "Creating..." : "Register"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/login")}
          className="mt-3 w-full py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50"
        >
          I already have an account
        </button>
      </form>
    </div>
  );
}