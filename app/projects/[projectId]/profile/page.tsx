"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ProjectBottomNav from "@/components/ProjectBottomNav";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { ChevronRightIcon } from "@heroicons/react/24/solid";

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

function getInitials(name: string) {
  if (!name.trim()) return "?";
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type OriginalValues = {
  title: string;
  fullName: string;
  companyName: string;
  country: string;
  phoneNumber: string;
  sector: string;
  jobTitle: string;
};

export default function ProjectProfilePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const { userId, checking } = useAuthGuard();

  // Profile state
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("Mr");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("Malaysia");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [sector, setSector] = useState("Contractor");
  const [jobTitle, setJobTitle] = useState("Project Manager");

  // Avatar dropdown
  const [menuOpen, setMenuOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [originalValues, setOriginalValues] = useState<OriginalValues | null>(null);

  const isDirty =
    originalValues !== null &&
    (title !== originalValues.title ||
      fullName !== originalValues.fullName ||
      companyName !== originalValues.companyName ||
      country !== originalValues.country ||
      phoneNumber !== originalValues.phoneNumber ||
      sector !== originalValues.sector ||
      jobTitle !== originalValues.jobTitle);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // App settings
  const [outputLanguage, setOutputLanguage] = useState("English");
  const [savingLanguage, setSavingLanguage] = useState(false);

  // Worker summary counts (for the navigate button preview)
  const [workerCount, setWorkerCount] = useState(0);
  const [customWorkerCount, setCustomWorkerCount] = useState(0);

  useEffect(() => {
    if (!checking && userId) {
      loadProfile();
      loadProjectSummary();
    }
  }, [checking, userId]);

  async function loadProfile() {
    if (!userId) return;
    setLoading(true);

    const { data: authData } = await supabase.auth.getUser();
    if (authData.user?.email) setEmail(authData.user.email);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!error && data) {
      const vals: OriginalValues = {
        title: data.title || "Mr",
        fullName: data.full_name || "",
        companyName: data.company_name || "",
        country: data.country || "Malaysia",
        phoneNumber: data.phone_number || "",
        sector: data.sector || "Contractor",
        jobTitle: data.job_title || "Project Manager",
      };
      setTitle(vals.title);
      setFullName(vals.fullName);
      setCompanyName(vals.companyName);
      setCountry(vals.country);
      setPhoneNumber(vals.phoneNumber);
      setSector(vals.sector);
      setJobTitle(vals.jobTitle);
      setOriginalValues(vals);
    } else if (error) {
      console.error("Failed to load profile:", error);
    }

    setLoading(false);
  }

  async function loadProjectSummary() {
    const { data, error } = await supabase
      .from("projects")
      .select("worker_types, custom_worker_types, output_language")
      .eq("id", projectId)
      .single();

    if (error) return;

    setWorkerCount(Array.isArray(data?.worker_types) ? data.worker_types.length : 0);
    setCustomWorkerCount(
      Array.isArray(data?.custom_worker_types) ? data.custom_worker_types.length : 0
    );
    setOutputLanguage(data?.output_language || "English");
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

    setOriginalValues({ title, fullName, companyName, country, phoneNumber, sector, jobTitle });
    setEditMode(false);
  }

  function cancelEdit() {
    if (!originalValues) return;
    setTitle(originalValues.title);
    setFullName(originalValues.fullName);
    setCompanyName(originalValues.companyName);
    setCountry(originalValues.country);
    setPhoneNumber(originalValues.phoneNumber);
    setSector(originalValues.sector);
    setJobTitle(originalValues.jobTitle);
    setEditMode(false);
  }

  async function saveOutputLanguage(lang: string) {
    setSavingLanguage(true);
    setOutputLanguage(lang);

    const { error } = await supabase
      .from("projects")
      .update({ output_language: lang })
      .eq("id", projectId);

    setSavingLanguage(false);
    if (error) alert("Failed to save language setting.");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const inputClass =
    "w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium min-h-11 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none";
  const sectionLabel =
    "text-[10px] font-bold tracking-widest text-slate-400 uppercase block mb-3";

  return (
    <div className="min-h-screen bg-slate-100">

      {/* HEADER */}
      <div className="bg-blue-900 text-white">
        <div className="h-[env(safe-area-inset-top)]" />
        <div className="px-5 pt-5 pb-9 max-w-lg mx-auto">
          <span className="text-[10px] font-bold tracking-widest text-blue-300 uppercase">
            Account &amp; Settings
          </span>
          <h1 className="text-[1.65rem] font-bold tracking-tight leading-tight mt-1">
            Profile
          </h1>
        </div>
        <div className="h-6 bg-slate-100 rounded-t-[2.5rem]" />
      </div>

      <div className="max-w-lg mx-auto px-4 pb-36 space-y-4 -mt-1">

        {checking || loading ? (
          <div className="bg-white border border-slate-200/70 shadow-sm rounded-2xl p-6">
            <div className="flex items-center gap-3 text-slate-500">
              <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Loading profile...</span>
            </div>
          </div>
        ) : (
          <>
            {/* ── AVATAR + IDENTITY ── */}
            <div className="bg-white shadow-sm border border-slate-200/70 rounded-2xl p-5">
              <div className="flex items-center gap-4">
              <div className="relative" ref={avatarRef}>
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-800 flex items-center justify-center shrink-0 shadow-md active:scale-[0.97] transition"
                >
                  <span className="text-xl font-bold text-white tracking-wide">
                    {getInitials(fullName)}
                  </span>
                </button>

                {/* Dropdown */}
                {menuOpen && (
                  <div className="absolute left-0 top-[72px] z-50 w-48 bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                    <button
                      onClick={() => { setMenuOpen(false); router.replace("/projects"); }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition text-left"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4 text-blue-500 shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                      </svg>
                      My Projects
                    </button>
                    <div className="border-t border-slate-100" />
                    <button
                      onClick={() => { setMenuOpen(false); handleLogout(); }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-red-600 hover:bg-red-50 active:bg-red-100 transition text-left"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4 shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-base leading-tight truncate">
                    {title} {fullName || "—"}
                  </p>
                  <p className="text-sm text-slate-500 truncate mt-0.5">{email}</p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {jobTitle}
                    {companyName ? ` · ${companyName}` : ""}
                  </p>
                </div>

                {/* Edit toggle */}
                <button
                  onClick={() => setEditMode((e) => !e)}
                  className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition active:scale-[0.98]
                    ${editMode
                      ? "bg-blue-100 text-blue-600"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* ── ACCOUNT PROFILE ── */}
            <div className="bg-white shadow-sm border border-slate-200/70 rounded-2xl p-5 space-y-4">
              <span className={sectionLabel}>Account Profile</span>

              {editMode ? (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1.5">Title</label>
                    <select className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)}>
                      {titleOptions.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1.5">Full Name</label>
                    <input
                      className={inputClass}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1.5">Phone / WhatsApp</label>
                    <input
                      className={inputClass}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g. +60123456789"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1.5">Company Name</label>
                    <input
                      className={inputClass}
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Enter company name"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1.5">Country</label>
                    <select className={inputClass} value={country} onChange={(e) => setCountry(e.target.value)}>
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
                    <label className="text-xs font-semibold text-slate-500 block mb-1.5">Sector / Industry</label>
                    <select className={inputClass} value={sector} onChange={(e) => setSector(e.target.value)}>
                      {sectorOptions.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1.5">Position / Job Title</label>
                    <select className={inputClass} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}>
                      {jobTitleOptions.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1.5">Email Address</label>
                    <input
                      className={`${inputClass} opacity-60 cursor-not-allowed`}
                      value={email}
                      disabled
                    />
                  </div>

                  {isDirty ? (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={cancelEdit}
                        className="flex-1 py-3.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm min-h-11 active:scale-[0.98] transition hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveProfile}
                        disabled={saving}
                        className="flex-1 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm min-h-11 active:scale-[0.98] transition disabled:opacity-60"
                      >
                        {saving ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditMode(false)}
                      className="w-full py-3.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm min-h-11 active:scale-[0.98] transition hover:bg-slate-50"
                    >
                      Done
                    </button>
                  )}
                </>
              ) : (
                <div className="space-y-0">
                  {[
                    { label: "Email", value: email },
                    { label: "Phone / WhatsApp", value: phoneNumber || "—" },
                    { label: "Company", value: companyName || "—" },
                    { label: "Country", value: country },
                    { label: "Sector", value: sector },
                    { label: "Position", value: jobTitle },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0"
                    >
                      <span className="text-xs font-semibold text-slate-400 shrink-0 mr-4">
                        {row.label}
                      </span>
                      <span className="text-sm font-medium text-slate-700 text-right truncate">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── PROJECT SETTINGS ── */}
            <div className="bg-white shadow-sm border border-slate-200/70 rounded-2xl overflow-hidden">
              <div className="px-5 pt-5 pb-3">
                <span className={sectionLabel}>Project Settings</span>
              </div>

              {/* Worker Types — navigate to subpage */}
              <button
                onClick={() => router.push(`/projects/${projectId}/workers`)}
                className="w-full flex items-center justify-between px-5 py-4 border-t border-slate-100 hover:bg-slate-50 active:bg-slate-100 transition active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5 text-blue-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-800">Worker Types</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {workerCount > 0 || customWorkerCount > 0
                        ? `${workerCount} standard · ${customWorkerCount} custom`
                        : "No worker types configured"}
                    </p>
                  </div>
                </div>
                <ChevronRightIcon className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {/* Output Language */}
              <div className="px-5 py-4 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5 text-amber-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">Report Language</p>
                    <p className="text-xs text-slate-400 mt-0.5">AI summary &amp; PDF output</p>
                  </div>
                  <select
                    className="text-sm font-semibold text-slate-700 bg-slate-100 border-0 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-9 cursor-pointer"
                    value={outputLanguage}
                    onChange={(e) => saveOutputLanguage(e.target.value)}
                    disabled={savingLanguage}
                  >
                    <option value="English">English</option>
                    <option value="Bahasa Melayu">BM</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ── SESSION / SIGN OUT ── */}
<div className="bg-white shadow-sm border border-slate-200/70 rounded-2xl p-5 space-y-3">
  <span className={sectionLabel}>Session</span>

  <button
    onClick={() => router.replace("/projects")}
    className="w-full py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold text-sm min-h-11 active:scale-[0.98] transition hover:bg-slate-100"
  >
    My Projects
  </button>

  <button
    onClick={handleLogout}
    className="w-full py-3.5 rounded-xl border border-red-200 bg-red-50 text-red-600 font-bold text-sm min-h-11 active:scale-[0.98] transition hover:bg-red-100"
  >
    Sign Out
  </button>
</div>
          </>
        )}
      </div>

      <ProjectBottomNav projectId={projectId} />
    </div>
  );
}