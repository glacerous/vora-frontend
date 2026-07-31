"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

const UiverseLoader = () => (
  <div className="newtons-cradle">
    <div className="newtons-cradle__dot"></div>
    <div className="newtons-cradle__dot"></div>
    <div className="newtons-cradle__dot"></div>
    <div className="newtons-cradle__dot"></div>
  </div>
);

export default function Dashboard() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        router.replace(`/reconstruct?code=${encodeURIComponent(code)}`);
      } else {
        router.replace(`/reconstruct`);
      }
    }
  }, [router]);

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
      <UiverseLoader />
      <span className="text-xs text-slate-500 font-medium">Redirecting to consolidated Vora dashboard...</span>
    </div>
  );
}
