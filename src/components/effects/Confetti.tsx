"use client";

import { useEffect, useState } from "react";

const COLORS = ["#fbbf24", "#34d399", "#f97316", "#ffffff", "#60a5fa", "#f472b6"];

interface Particle {
  id: number;
  left: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    delay: Math.random() * 0.8,
    duration: 1.8 + Math.random() * 1.5,
    size: 4 + Math.random() * 6,
  }));
}

export default function Confetti({ particleCount = 40 }: { particleCount?: number }) {
  const [visible, setVisible] = useState(true);
  const [particles] = useState(() => generateParticles(particleCount));

  useEffect(() => {
    const timeout = setTimeout(() => setVisible(false), 3500);
    return () => clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="animate-confetti absolute rounded-sm"
          style={{
            left: `${p.left}%`,
            top: "-10px",
            width: p.size,
            height: p.size * 1.4,
            backgroundColor: p.color,
            "--fall-delay": `${p.delay}s`,
            "--fall-duration": `${p.duration}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
