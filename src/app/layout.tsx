import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import "./globals.css";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import { AuthProvider } from "@/components/AuthProvider";
import { ScanProgressProvider } from "@/components/ScanProgressProvider";
import ScanProgressPill from "@/components/ScanProgressPill";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const loraSerif = Lora({
  variable: "--font-serif-display",
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vora — Measure Forest Carbon",
  description: "3D Gaussian Splatting and carbon metrics estimation for environmental conservation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${loraSerif.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#fafaf9] text-[#292524]">
        <AuthProvider>
          <ScanProgressProvider>
            <SmoothScrollProvider>
              <ScrollProgressBar />
              <Navbar />
              {children}
              <ScanProgressPill />
            </SmoothScrollProvider>
          </ScanProgressProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
