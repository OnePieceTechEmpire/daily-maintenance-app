"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  UserCircleIcon,
  BuildingOffice2Icon,
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";

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

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    if (!fullName.trim()) return alert("Please enter your full name.");
    if (!companyName.trim()) return alert("Please enter your company name.");
    if (!phoneNumber.trim()) return alert("Please enter your phone number / WhatsApp.");
    if (!email.trim()) return alert("Please enter your email address.");
    if (password.length < 6) return alert("Password must be at least 6 characters.");
    if (password !== confirmPassword) return alert("Password and confirm password do not match.");
    if (!termsAccepted) return alert("Please agree to the Terms & Conditions.");

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
        console.error(profileErr);
        setLoading(false);
        return alert("Account created, but failed to save profile details.");
      }
    }

    setLoading(false);
    router.push("/projects");
  }

  const inputClass =
    "w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-gray-800 focus:ring-2 focus:ring-blue-400 focus:outline-none";
  const labelClass = "block text-sm font-semibold text-gray-700 mb-1.5";

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6">
      <div className="max-w-lg mx-auto">
        <form
          onSubmit={handleRegister}
          className="bg-white border border-gray-200 shadow-sm rounded-3xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-blue-900 text-white shadow-lg px-6 py-8">
            <h1 className="text-2xl font-bold">Create account</h1>
            <p className="text-sm text-blue-100 mt-1">
              Register your SiteDiary2U account to manage site reports.
            </p>
          </div>

          <div className="p-5 space-y-5">
            {/* Personal Info */}
            <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-2 mb-4">
                <UserCircleIcon className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-gray-800">Personal Information</h2>
              </div>

              <div className="space-y-4">
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
      let value = e.target.value.replace(/\D/g, ""); // numbers only

      // format: 017-1234567
      if (value.length > 3) {
        value = value.slice(0, 3) + "-" + value.slice(3, 11);
      }

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
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* Company Info */}
            <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-2 mb-4">
                <BuildingOffice2Icon className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-gray-800">Company Information</h2>
              </div>

              <div className="space-y-4">
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
              </div>
            </section>

            {/* Security */}
            <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-gray-800">Security</h2>
              </div>

              <div className="space-y-4">
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
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="w-5 h-5" />
                      ) : (
                        <EyeIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      className={`${inputClass} pr-12`}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showConfirmPassword ? (
                        <EyeSlashIcon className="w-5 h-5" />
                      ) : (
                        <EyeIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Terms */}
            <label className="flex items-start gap-3 p-4 rounded-2xl border border-gray-200 bg-blue-50">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 w-4 h-4"
              />
              <span className="text-sm text-gray-700 leading-relaxed">
                I agree to the <span className="font-semibold">Terms & Conditions</span>.
              </span>
            </label>

            {/* CTA */}
            <div className="space-y-3 pt-1">
              <button
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-2xl active:scale-95 transition disabled:opacity-60"
              >
                {loading ? "Creating account..." : "Register"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/login")}
                className="w-full py-3.5 rounded-2xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50"
              >
                I already have an account
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}