import type { Metadata } from "next";
import {
  Bebas_Neue,
  Chakra_Petch,
  Fira_Code,
  IBM_Plex_Mono,
  Lato,
  Orbitron,
  Playfair_Display,
  Press_Start_2P,
  Rajdhani,
  Share_Tech_Mono,
  Space_Mono,
  VT323,
} from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

// ── Theme font faces ─────────────────────────────────────────────────────────
// Every theme's display/body pairing is loaded here once and exposed as a CSS
// variable; src/data/themes.ts maps each theme onto the variables. Only the
// reference identity (Midnight Circuit) is preloaded; the rest lazy-load when
// their theme is selected.

const orbitron = Orbitron({ variable: "--font-orbitron", subsets: ["latin"], display: "swap" });
const rajdhani = Rajdhani({ variable: "--font-rajdhani", subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });

const bebasNeue = Bebas_Neue({ variable: "--font-bebas", subsets: ["latin"], weight: "400", display: "swap", preload: false });
const shareTechMono = Share_Tech_Mono({ variable: "--font-share-tech", subsets: ["latin"], weight: "400", display: "swap", preload: false });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], style: ["normal", "italic"], display: "swap", preload: false });
const lato = Lato({ variable: "--font-lato", subsets: ["latin"], weight: ["300", "400", "700"], display: "swap", preload: false });
const pressStart = Press_Start_2P({ variable: "--font-press-start", subsets: ["latin"], weight: "400", display: "swap", preload: false });
const spaceMono = Space_Mono({ variable: "--font-space-mono", subsets: ["latin"], weight: ["400", "700"], display: "swap", preload: false });
const vt323 = VT323({ variable: "--font-vt323", subsets: ["latin"], weight: "400", display: "swap", preload: false });
const firaCode = Fira_Code({ variable: "--font-fira-code", subsets: ["latin"], display: "swap", preload: false });
const chakraPetch = Chakra_Petch({ variable: "--font-chakra", subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", preload: false });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500", "600"], display: "swap", preload: false });

const FONT_CLASSES = [
  orbitron,
  rajdhani,
  bebasNeue,
  shareTechMono,
  playfair,
  lato,
  pressStart,
  spaceMono,
  vt323,
  firaCode,
  chakraPetch,
  plexMono,
].map((font) => font.variable).join(" ");

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
      <body className={`${FONT_CLASSES} min-h-screen bg-zinc-950 text-zinc-100 antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
