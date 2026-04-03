import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const openDyslexic = localFont({
  src: [
    { path: "../../public/fonts/OpenDyslexic-Regular.woff", weight: "400", style: "normal" },
    { path: "../../public/fonts/OpenDyslexic-Bold.woff", weight: "700", style: "normal" },
    { path: "../../public/fonts/OpenDyslexic-Italic.woff", weight: "400", style: "italic" },
    { path: "../../public/fonts/OpenDyslexic-BoldItalic.woff", weight: "700", style: "italic" },
  ],
  variable: "--font-dyslexic",
});

export const metadata: Metadata = {
  title: "Rags to Races",
  description: "An incremental game where you garbage-pick your way from a busted lawnmower to a racing empire.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${openDyslexic.variable} min-h-screen bg-zinc-950 text-zinc-100 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
