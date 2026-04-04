"use client";

import { useEffect, useRef, useState } from "react";
import type { RaceEvent } from "@/engine/raceEvents";

interface Particle {
  id: number;
  cx: number;
  cy: number;
  type: "exhaust" | "dust" | "smoke" | "spark";
  born: number;
}

interface RaceParticlesProps {
  progress: number;
  eventType: RaceEvent["type"] | null;
  playerX: number;
  playerY: number;
  ambientParticles: "dust" | "leaves" | "sparks" | null;
}

const MAX_PARTICLES = 20;
const PARTICLE_LIFETIME: Record<Particle["type"], number> = {
  exhaust: 400,
  dust: 600,
  smoke: 500,
  spark: 350,
};

let nextId = 0;

export default function RaceParticles({
  progress,
  eventType,
  playerX,
  playerY,
  ambientParticles,
}: RaceParticlesProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const lastProgressRef = useRef(progress);

  useEffect(() => {
    const delta = progress - lastProgressRef.current;
    lastProgressRef.current = progress;

    if (progress <= 0 || progress >= 1 || delta <= 0) return;

    const now = Date.now();
    const newParticles: Particle[] = [];

    // Exhaust puffs — spawn periodically behind player
    if (Math.random() < 0.3) {
      newParticles.push({
        id: nextId++,
        cx: playerX - 6 + (Math.random() - 0.5) * 4,
        cy: playerY + (Math.random() - 0.5) * 6,
        type: "exhaust",
        born: now,
      });
    }

    // Dust — on dirt/backyard circuits
    if (ambientParticles === "dust" && Math.random() < 0.25) {
      newParticles.push({
        id: nextId++,
        cx: playerX - 4 + (Math.random() - 0.5) * 8,
        cy: playerY + (Math.random() - 0.5) * 8,
        type: "dust",
        born: now,
      });
    }

    // Tire smoke on close calls
    if (eventType === "close_call") {
      for (let i = 0; i < 3; i++) {
        newParticles.push({
          id: nextId++,
          cx: playerX + (Math.random() - 0.5) * 10,
          cy: playerY + (Math.random() - 0.5) * 10,
          type: "smoke",
          born: now,
        });
      }
    }

    // Sparks on mechanical failures
    if (eventType === "mechanical") {
      for (let i = 0; i < 4; i++) {
        newParticles.push({
          id: nextId++,
          cx: playerX + (Math.random() - 0.5) * 6,
          cy: playerY + (Math.random() - 0.5) * 6,
          type: "spark",
          born: now,
        });
      }
    }

    setParticles((prev) => {
      // Remove expired particles
      const alive = prev.filter(
        (p) => now - p.born < PARTICLE_LIFETIME[p.type],
      );
      const combined = [...alive, ...newParticles];
      // Enforce cap
      return combined.slice(-MAX_PARTICLES);
    });
  }, [progress, eventType, playerX, playerY, ambientParticles]);

  // Clean up when race ends
  useEffect(() => {
    if (progress >= 1 || progress <= 0) {
      setParticles([]);
    }
  }, [progress]);

  return (
    <g className="race-particles">
      {particles.map((p) => {
        const age = Date.now() - p.born;
        const lifetime = PARTICLE_LIFETIME[p.type];
        const t = Math.min(1, age / lifetime);

        return (
          <circle
            key={p.id}
            cx={p.cx}
            cy={p.cy}
            r={getRadius(p.type)}
            fill={getColor(p.type)}
            opacity={getOpacity(p.type, t)}
            style={{
              transform: `scale(${1 + t * getScaleGrowth(p.type)})`,
              transformOrigin: `${p.cx}px ${p.cy}px`,
              transition: "opacity 80ms, transform 80ms",
            }}
          />
        );
      })}
    </g>
  );
}

function getRadius(type: Particle["type"]): number {
  switch (type) {
    case "exhaust": return 1.5;
    case "dust": return 2.5;
    case "smoke": return 2;
    case "spark": return 0.8;
  }
}

function getColor(type: Particle["type"]): string {
  switch (type) {
    case "exhaust": return "var(--text-muted)";
    case "dust": return "#8a6a3a";
    case "smoke": return "var(--text-muted)";
    case "spark": return "var(--warning)";
  }
}

function getOpacity(type: Particle["type"], t: number): number {
  const baseOpacity = type === "spark" ? 0.9 : type === "dust" ? 0.4 : 0.3;
  return baseOpacity * (1 - t);
}

function getScaleGrowth(type: Particle["type"]): number {
  switch (type) {
    case "exhaust": return 1.5;
    case "dust": return 2;
    case "smoke": return 2.5;
    case "spark": return 0.3;
  }
}
