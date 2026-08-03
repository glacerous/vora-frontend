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
          href="/" 
          className={`text-sm transition-colors duration-200 ${
            pathname === "/" ? "text-[#191919] font-medium" : "text-[#191919]/70 hover:text-[#191919]"
          }`}
        >
          Home
        </Link>
        <Link 
          href="/gallery" 
          className={`text-sm transition-colors duration-200 ${
            pathname === "/gallery" ? "text-[#191919] font-medium" : "text-[#191919]/70 hover:text-[#191919]"
          }`}
        >
          Gallery
        </Link>
        <Link 
          href="/reconstruct" 
          className={`text-sm transition-colors duration-200 ${
            pathname === "/reconstruct" ? "text-[#191919] font-medium" : "text-[#191919]/70 hover:text-[#191919]"
          }`}
        >
          New Scan
        </Link>
        {user && (
          <Link 
            href="/my-plots" 
            className={`text-sm transition-colors duration-200 ${
              pathname === "/my-plots" ? "text-[#191919] font-medium" : "text-[#191919]/70 hover:text-[#191919]"
            }`}
          >
            My Plots
          </Link>
        )}
      </div>

      {/* Right action links */}
      <div className="flex items-center gap-4 min-h-[32px]">
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
                className="text-xs font-semibold bg-[#191919] text-white hover:bg-[#191919]/90 px-4 py-2 rounded-xl transition-all cursor-pointer"
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
