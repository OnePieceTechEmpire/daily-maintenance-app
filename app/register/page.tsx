"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import {
  UserCircleIcon,
  BuildingOffice2Icon,
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";

const titleOptions = ["Mr", "Ms", "Ar", "Ir", "Ts", "Dr"];

const sectorOptions = [
  "Contractor", "Consultant", "Developer", "Architect",
  "Engineer", "Quantity Surveyor", "Site Supervisor",
];

const jobTitleOptions = [
  "Project Director", "Project Manager", "Construction Manager",
  "Project Engineer", "Site Engineer",
  "Designer / Design Engineer / Architect", "Quantity Surveyor (QS)",
  "Project Coordinator", "Clerk of Work (COW)", "Site Supervisor",
  "Safety Officer", "Foreman / Chargeman", "Technician",
  "Skilled Worker / Specialist Worker", "General Worker / Site Worker",
];

export default function RegisterPage() {
  const router = useRouter();

  const [title, setTitle] = useState("Mr");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("Malaysia");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [sector, setSector] = useState("Contractor");
  const [jobTitle, setJobTitle] = useState("Project Manager");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");

  const passwordMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const passwordStrong = password.length >= 6;

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!fullName.trim()) return setError("Please enter your full name.");
    if (!companyName.trim()) return setError("Please enter your company name.");
    if (!phoneNumber.trim()) return setError("Please enter your phone number.");
    if (!email.trim()) return setError("Please enter your email address.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    if (!termsAccepted) return setError("Please agree to the Terms & Conditions.");

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError) {
      setLoading(false);
      return setError(signUpError.message);
    }

    const user = data.user;
    if (user) {
      const { error: profileErr } = await supabase.from("profiles").upsert({
        id: user.id,
        title,
        full_name: fullName,
        company_name: companyName,
        country,
        phone_number: phoneNumber,
        sector,
        job_title: jobTitle,
        terms_accepted: termsAccepted,
        role: "owner",
      });

      if (profileErr) {
        setLoading(false);
        return setError("Account created but failed to save profile details.");
      }
    }

    setLoading(false);
    router.push("/projects");
  }

  const inputClass =
    "w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium min-h-11 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm";
  const labelClass = "text-xs font-semibold text-slate-500 block mb-1.5";

  const SectionCard = ({
    icon, title, children,
  }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
    <div className="bg-white shadow-sm border border-slate-200/70 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <span className="text-sm font-bold text-slate-800">{title}</span>
      </div>
      <div className="px-5 py-4 space-y-4">{children}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">

      {/* HEADER */}
      <div className="bg-blue-900 text-white">
        <div className="h-[env(safe-area-inset-top)]" />
        <div className="px-5 pt-10 pb-12 max-w-lg mx-auto flex flex-col items-center text-center">
          <Image
            src="/logs.png"
            alt="SiteDiary2U"
            width={56}
            height={56}
            className="rounded-2xl shadow-lg mb-4"
            priority
          />
          <h1 className="text-2xl font-bold tracking-tight">Create Account</h1>
          <p className="text-blue-200 text-sm mt-1 opacity-90">
            Register to start managing your site reports.
          </p>
        </div>
        <div className="h-6 bg-slate-100 rounded-t-[2.5rem]" />
      </div>

      {/* FORM */}
      <div className="max-w-lg w-full mx-auto px-4 -mt-1 pb-16 space-y-4">

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-red-500 shrink-0 mt-0.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-sm text-red-600 font-medium">{error}</p>
          </div>
        )}

        {/* ── PERSONAL INFO ── */}
        <SectionCard
          icon={<UserCircleIcon className="w-4 h-4 text-blue-600" />}
          title="Personal Information"
        >
          <div>
            <label className={labelClass}>Title</label>
            <select className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)}>
              {titleOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>Full Name</label>
            <input
              className={inputClass}
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Phone Number / WhatsApp</label>
            <input
              className={inputClass}
              type="tel"
              inputMode="numeric"
              placeholder="e.g. 017-1234567"
              value={phoneNumber}
              onChange={(e) => {
                let value = e.target.value.replace(/\D/g, "");
                if (value.length > 3) value = value.slice(0, 3) + "-" + value.slice(3, 11);
                setPhoneNumber(value);
              }}
              maxLength={12}
            />
          </div>

          <div>
            <label className={labelClass}>Email Address</label>
            <input
              type="email"
              className={inputClass}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </SectionCard>

        {/* ── COMPANY INFO ── */}
        <SectionCard
          icon={<BuildingOffice2Icon className="w-4 h-4 text-blue-600" />}
          title="Company Information"
        >
          <div>
            <label className={labelClass}>Company Name</label>
            <input
              className={inputClass}
              placeholder="Enter company name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Country</label>
            <select className={inputClass} value={country} onChange={(e) => setCountry(e.target.value)}>
              {["Malaysia","Singapore","Indonesia","Thailand","United Kingdom","United States","Australia","Other"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Sector / Industry</label>
            <select className={inputClass} value={sector} onChange={(e) => setSector(e.target.value)}>
              {sectorOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>Position / Job Title</label>
            <select className={inputClass} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}>
              {jobTitleOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
        </SectionCard>

        {/* ── SECURITY ── */}
        <SectionCard
          icon={<ShieldCheckIcon className="w-4 h-4 text-blue-600" />}
          title="Security"
        >
          <div>
            <label className={labelClass}>Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className={`${inputClass} pr-12`}
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
            {/* Password strength indicator */}
            {password.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex gap-1 flex-1">
                  {[1,2,3].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                      password.length === 0 ? "bg-slate-200"
                      : password.length < 6 ? i === 1 ? "bg-red-400" : "bg-slate-200"
                      : password.length < 10 ? i <= 2 ? "bg-amber-400" : "bg-slate-200"
                      : "bg-emerald-400"
                    }`} />
                  ))}
                </div>
                <span className={`text-[10px] font-bold ${
                  password.length < 6 ? "text-red-500"
                  : password.length < 10 ? "text-amber-500"
                  : "text-emerald-500"
                }`}>
                  {password.length < 6 ? "Weak" : password.length < 10 ? "Fair" : "Strong"}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className={labelClass}>Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                className={`${inputClass} pr-12 ${
                  passwordMismatch ? "border-red-300 focus:ring-red-400" :
                  passwordMatch ? "border-emerald-300 focus:ring-emerald-400" : ""
                }`}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                {showConfirmPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
              {/* Match indicator */}
              {passwordMatch && (
                <div className="absolute right-10 top-1/2 -translate-y-1/2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-500">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            {passwordMismatch && (
              <p className="text-[11px] text-red-500 font-medium mt-1.5 pl-1">Passwords do not match</p>
            )}
          </div>
        </SectionCard>

        {/* ── TERMS ── */}
        <label className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-slate-200/70 shadow-sm cursor-pointer">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded accent-blue-600 shrink-0"
          />
          <span className="text-sm text-slate-600 leading-relaxed">
            I agree to the{" "}
            <span className="font-semibold text-blue-600">Terms & Conditions</span>
            {" "}and{" "}
            <span className="font-semibold text-blue-600">Privacy Policy</span>.
          </span>
        </label>

        {/* ── CTA ── */}
        <div className="space-y-3">
          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl min-h-11 active:scale-[0.98] transition disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Creating account...
              </span>
            ) : "Create Account"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/login")}
            className="w-full py-3.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm min-h-11 active:scale-[0.98] transition hover:bg-slate-50"
          >
            Already have an account? Sign In
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 pb-4">
          By registering, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}