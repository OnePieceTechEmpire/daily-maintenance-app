import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">

      <div className="max-w-md text-center">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image
            src="/suite.png"
            alt="SiteDiary2U Logo"
            width={160}
            height={160}
            priority
          />
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-blue-900 mb-4">
          SiteDiary2U
        </h1>

        {/* Description */}
        <p className="text-gray-600 mb-8">
          Professional Daily Site Reporting for Construction,
          Renovation & Maintenance Projects.
        </p>

        {/* Button */}
        <Link
          href="/projects"
          className="inline-block bg-blue-900 text-white px-6 py-3 rounded-xl shadow-md hover:bg-blue-800 transition"
        >
          Go to Projects
        </Link>
      </div>

    </main>
  );
}
