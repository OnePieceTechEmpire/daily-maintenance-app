"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProjectBottomNav from "@/components/ProjectBottomNav";
import { useAuthGuard } from "@/lib/useAuthGuard";

const titleOptions = ["Mr", "Ms", "Ar", "Ir", "Ts", "Dr"];

const sectorOptions = [
  "Contractor",
  "Consultant",
  "Developer",
  "Architect",
  "Engineer",
  "Quantity Surveyor",
  "Site Supervisor",
];

const jobTitleOptions = [
  "Project Director",
  "Project Manager",
  "Construction Manager",
  "Project Engineer",
  "Site Engineer",
  "Designer / Design Engineer / Architect",
  "Quantity Surveyor (QS)",
  "Project Coordinator",
  "Clerk of Work (COW)",
  "Site Supervisor",
  "Safety Officer",
  "Foreman / Chargeman",
  "Technician",
  "Skilled Worker / Specialist Worker",
  "General Worker / Site Worker",
];

export default function ProjectProfilePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const { userId, checking } = useAuthGuard();

  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("Mr");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("Malaysia");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [sector, setSector] = useState("Contractor");
  const [jobTitle, setJobTitle] = useState("Project Manager");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!checking && userId) {
      loadProfile();
    }
  }, [checking, userId]);

  async function loadProfile() {
    if (!userId) return;

    setLoading(true);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (!authErr && authData.user?.email) {
      setEmail(authData.user.email);
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Failed to load profile:", error);
      setLoading(false);
      return;
    }

    setTitle(data?.title || "Mr");
    setFullName(data?.full_name || "");
    setCompanyName(data?.company_name || "");
    setCountry(data?.country || "Malaysia");
    setPhoneNumber(data?.phone_number || "");
    setSector(data?.sector || "Contractor");
    setJobTitle(data?.job_title || "Project Manager");

    setLoading(false);
  }

  async function saveProfile() {
    if (!userId) return;
    if (!fullName.trim()) return alert("Please enter your full name.");
    if (!companyName.trim()) return alert("Please enter your company name.");

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        title,
        full_name: fullName,
        company_name: companyName,
        country,
        phone_number: phoneNumber,
        sector,
        job_title: jobTitle,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    setSaving(false);

    if (error) {
      console.error(error);
      alert("Failed to save profile.");
      return;
    }

    alert("Profile updated ✅");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const inputClass =
    "w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-gray-800 focus:ring-2 focus:ring-blue-400 focus:outline-none";
  const labelClass = "block text-sm font-semibold text-gray-700 mb-1.5";

  return (
    <div className="min-h-screen bg-gray-100">
      {/* HEADER */}
      <div className="bg-blue-900 text-white shadow-lg">
        <div className="h-[env(safe-area-inset-top)]" />
        <div className="p-6 rounded-b-3xl">
          <div className="max-w-5xl mx-auto flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Profile</h1>
              <p className="text-sm text-blue-100 mt-1">
                Manage your account details
              </p>
            </div>


          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-5 pb-28 space-y-5">
        {checking || loading ? (
          <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
            <div className="flex items-center gap-3 text-gray-600">
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Loading profile...</span>
            </div>
          </div>
        ) : (
          <>
            {/* ACCOUNT */}
            <section className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5 space-y-4">
              <h2 className="font-semibold text-gray-800">Account Information</h2>

              <div>
                <label className={labelClass}>Email Address</label>
                <input
                  className={`${inputClass} bg-gray-50 text-gray-500`}
                  value={email}
                  disabled
                />
              </div>
            </section>

            {/* PERSONAL */}
            <section className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5 space-y-4">
              <h2 className="font-semibold text-gray-800">Personal Information</h2>

              <div>
                <label className={labelClass}>Title</label>
                <select
                  className={inputClass}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                >
                  {titleOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Full Name</label>
                <input
                  className={inputClass}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className={labelClass}>Phone Number / WhatsApp</label>
                <input
                  className={inputClass}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. +60123456789"
                />
              </div>
            </section>

            {/* COMPANY */}
            <section className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5 space-y-4">
              <h2 className="font-semibold text-gray-800">Company Information</h2>

              <div>
                <label className={labelClass}>Company Name</label>
                <input
                  className={inputClass}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter company name"
                />
              </div>

              <div>
                <label className={labelClass}>Country</label>
                <select
                  className={inputClass}
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
              </div>

              <div>
                <label className={labelClass}>Sector / Industry</label>
                <select
                  className={inputClass}
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                >
                  {sectorOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Position / Job Title</label>
                <select
                  className={inputClass}
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                >
                  {jobTitleOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            {/* ACTIONS */}
            <section className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5 space-y-3">
              <button
                onClick={saveProfile}
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-2xl active:scale-95 transition disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>

              <button
                onClick={handleLogout}
                className="w-full border border-red-200 text-red-600 font-semibold py-3.5 rounded-2xl hover:bg-red-50 active:scale-95 transition"
              >
                Logout
              </button>
            </section>
          </>
        )}
      </div>

      <ProjectBottomNav projectId={projectId} />
    </div>
  );
}