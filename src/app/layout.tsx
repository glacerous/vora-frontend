import type { Metadata } from "next";
import { Anton, Outfit } from "next/font/google";
import "./globals.css";

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
  title: "Vora — 3D Carbon Dashboard",
  description: "WebGL 3D tree scan visualization and carbon analysis metrics dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-slate-900 text-slate-100">
        {children}
      </body>
    </html>
  );
}
