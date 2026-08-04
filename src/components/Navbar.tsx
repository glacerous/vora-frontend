"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 sm:px-10 md:px-14 py-4 sm:py-5 flex justify-between items-center bg-white/90 backdrop-blur-sm border-b border-slate-100 font-sans">
      <Link href="/" className="flex items-center cursor-pointer">
        <span className="font-bold text-xl tracking-tight text-[#191919]">
          Vora.
        </span>
      </Link>

      {/* Center links */}
      <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
        <Link 
          href="/gallery" 
          className={`text-sm transition-colors duration-200 ${
            pathname === "/gallery" ? "text-[#191919] font-medium" : "text-[#191919]/70 hover:text-[#191919]"
          }`}
        >
          Gallery
        </Link>
        {user && (
          <Link 
            href="/my-plots" 
            className={`text-sm transition-colors duration-200 ${
              pathname === "/my-plots" ? "text-[#191919] font-medium" : "text-[#191919]/70 hover:text-[#191919]"
            }`}
          >
            Dashboard
          </Link>
        )}
      </div>

      {/* Right action links */}
      <div className="flex items-center gap-4 min-h-[32px]">
        {/* New Scan Action Button */}
        <Link
          href="/reconstruct"
          className="text-xs font-semibold bg-[#191919] text-white hover:bg-[#191919]/90 px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Scan
        </Link>

        {!loading && (
          user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 font-medium bg-slate-100 px-3 py-1.5 rounded-xl">
                {user.display_name || user.username}
              </span>
              <button
                onClick={logout}
                className="text-xs text-red-650 font-semibold hover:text-red-500 transition-colors cursor-pointer"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-xs font-semibold text-[#191919]/70 hover:text-[#191919] transition-colors cursor-pointer"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="text-xs font-semibold border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-[#191919] px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                Sign Up
              </Link>
            </div>
          )
        )}
      </div>
    </nav>
  );
}
