import type { Metadata } from "next";
import { Inter, Anton, Outfit } from "next/font/google";
import "./globals.css";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import { AuthProvider } from "@/components/AuthProvider";
import { ScanProgressProvider } from "@/components/ScanProgressProvider";
import ScanProgressPill from "@/components/ScanProgressPill";
import Navbar from "@/components/Navbar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
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
      className={`${inter.variable} ${anton.variable} ${outfit.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col font-sans bg-white text-[#191919]">
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
