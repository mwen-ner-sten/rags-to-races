import type { Metadata } from "next";
import { Barlow_Condensed, IBM_Plex_Mono, IBM_Plex_Sans, Kalam } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

// Era 1 writes in pencil (Kalam); the Team era paints shop signs (Barlow Condensed).
const kalam = Kalam({ variable: "--font-kalam", subsets: ["latin"], weight: ["400", "700"], display: "swap" });
const barlow = Barlow_Condensed({ variable: "--font-barlow", subsets: ["latin"], weight: ["500", "600", "700"], display: "swap", preload: false });
const plexSans = IBM_Plex_Sans({ variable: "--font-plex-sans", subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"], display: "swap" });

export const metadata: Metadata = {
  title: "Rags to Races",
  description: "A slow, hands-on incremental: scavenge junk, build questionable machines, race them, and grow a racing team.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${kalam.variable} ${barlow.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
