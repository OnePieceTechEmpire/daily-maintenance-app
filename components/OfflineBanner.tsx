"use client";

import { useOnlineStatus } from "@/lib/useOnlineStatus";

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white text-center text-sm font-semibold px-4 py-2 shadow">
      No internet connection. Some features may not work.
    </div>
  );
}