"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 sm:px-10 md:px-14 py-4 sm:py-5 flex justify-between items-center bg-white/90 backdrop-blur-sm border-b border-slate-100 font-sans">
      <Link href="/" className="flex items-center cursor-pointer select-none">
        <Image
          src="/logo-wordmark.png"
          alt="Vora"
          width={332}
          height={115}
          className="h-6 sm:h-7 w-auto object-contain"
          loading="eager"
          priority
        />
      </Link>

      {/* Center links (Desktop-only) */}
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
      <div className="flex items-center gap-3 sm:gap-4 min-h-[32px]">
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

        {/* Auth status (Desktop-only) */}
        {!loading && (
          <div className="hidden md:flex items-center gap-3">
            {user ? (
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
            )}
          </div>
        )}

        {/* Hamburger Menu Button (Mobile-only) */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex md:hidden p-1.5 text-[#191919]/70 hover:text-[#191919] hover:bg-slate-50 rounded-xl transition"
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {menuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-slate-100 shadow-lg px-6 py-5 flex flex-col gap-3.5 md:hidden z-40 animate-fadeIn">
          <Link
            href="/gallery"
            onClick={() => setMenuOpen(false)}
            className={`text-sm py-1.5 font-medium transition ${
              pathname === "/gallery" ? "text-[#191919] font-semibold" : "text-[#191919]/70 hover:text-[#191919]"
            }`}
          >
            Gallery
          </Link>
          {user && (
            <Link
              href="/my-plots"
              onClick={() => setMenuOpen(false)}
              className={`text-sm py-1.5 font-medium transition ${
                pathname === "/my-plots" ? "text-[#191919] font-semibold" : "text-[#191919]/70 hover:text-[#191919]"
              }`}
            >
              Dashboard
            </Link>
          )}
          
          <div className="h-px bg-slate-100 my-1" />

          {!loading && (
            user ? (
              <div className="flex flex-col gap-3">
                <span className="text-xs text-slate-550 font-medium bg-slate-50 border border-slate-200/50 px-3.5 py-2 rounded-xl self-start">
                  Logged in: {user.display_name || user.username}
                </span>
                <button
                  onClick={() => {
                    logout();
                    setMenuOpen(false);
                  }}
                  className="text-xs text-red-650 font-bold hover:text-red-500 text-left py-1.5 transition-colors cursor-pointer"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="text-sm font-semibold text-[#191919]/70 hover:text-[#191919] py-1"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMenuOpen(false)}
                  className="text-sm font-semibold border border-slate-200 text-center hover:bg-slate-50 text-[#191919] py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Sign Up
                </Link>
              </div>
            )
          )}
        </div>
      )}
    </nav>
  );
}
