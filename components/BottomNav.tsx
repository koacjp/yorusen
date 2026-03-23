"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  // Don't show nav on onboarding page
  if (pathname === "/onboarding") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-pink-100 flex items-center justify-around px-4 py-2 z-50">
      <Link
        href="/"
        className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-colors ${
          pathname === "/"
            ? "text-pink-500"
            : "text-gray-400 hover:text-pink-400"
        }`}
      >
        <span className="text-xl">🏠</span>
        <span className="text-xs font-medium">相談</span>
      </Link>

      <Link
        href="/customers"
        className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-colors ${
          pathname === "/customers"
            ? "text-pink-500"
            : "text-gray-400 hover:text-pink-400"
        }`}
      >
        <span className="text-xl">👥</span>
        <span className="text-xs font-medium">お客さん帳</span>
      </Link>

      <Link
        href="/onboarding"
        className="flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl text-gray-300 hover:text-pink-300 transition-colors"
      >
        <span className="text-xl">⚙️</span>
        <span className="text-xs font-medium">設定リセット</span>
      </Link>
    </nav>
  );
}
