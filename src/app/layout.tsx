import type { Metadata } from "next";
import { IBM_Plex_Mono, Orbitron, Rajdhani } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import "./feed.css";
import "./race-extras.css";
import "./garage-extras.css";
import "./controls.css";
import "./customers.css";

// "Midnight Circuit": Orbitron for signage, Rajdhani for reading, Plex Mono for numbers.
const orbitron = Orbitron({ variable: "--font-orbitron", subsets: ["latin"], weight: ["500", "700", "900"], display: "swap" });
const rajdhani = Rajdhani({ variable: "--font-rajdhani", subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"], display: "swap", preload: false });

export const metadata: Metadata = {
  title: "Rags to Races",
  description: "A slow, hands-on incremental: scavenge junk, build questionable machines, race them, and grow a racing team.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${orbitron.variable} ${rajdhani.variable} ${plexMono.variable}`}>
      <body>
        {children}
        {process.env.VERCEL === "1" && <Analytics />}
      </body>
    </html>
  );
}
