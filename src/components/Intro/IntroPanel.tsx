"use client";

interface Props {
  onBegin: () => void;
}

const STORY_BEATS = [
  "You wake up to the smell of gasoline and burnt toast behind Earl's Discount Auto & Bait.",
  "Your first race machine? A push mower with optimism, zip ties, and exactly one good wheel.",
  "Legend says anyone can become a champion with enough junk, stubbornness, and questionable engineering.",
  "Tonight, the Backyard Derby lights are on. Win hearts. Win scrap. Try not to explode.",
];

export default function IntroPanel({ onBegin }: Props) {
  return (
    <section
      className="mx-auto max-w-3xl rounded-xl border p-6 shadow-2xl"
      style={{
        background: "var(--panel-bg)",
        borderColor: "var(--panel-border-active)",
        boxShadow: "0 0 30px color-mix(in srgb, var(--accent) 20%, transparent)",
      }}
    >
      <p className="mb-2 text-xs uppercase tracking-[0.25em]" style={{ color: "var(--text-secondary)" }}>
        Prologue
      </p>
      <h1 className="mb-4 text-3xl font-black tracking-tight" style={{ color: "var(--text-heading)" }}>
        Rags to Races: The First Night
      </h1>

      <div className="space-y-3 text-sm leading-7 md:text-base" style={{ color: "var(--text-primary)" }}>
        {STORY_BEATS.map((beat) => (
          <p key={beat}>{beat}</p>
        ))}
      </div>

      <div className="mt-6 rounded-lg border p-4" style={{ borderColor: "var(--accent-border)", background: "var(--accent-bg)" }}>
        <p className="text-sm" style={{ color: "var(--text-white)" }}>
          <span className="font-semibold">Objective:</span> Scavenge parts, build your first ride, then conquer the circuits one busted bolt at a time.
        </p>
      </div>

      <button
        onClick={onBegin}
        className="mt-6 rounded-md px-5 py-3 text-sm font-semibold uppercase tracking-wider transition"
        style={{
          background: "var(--btn-primary-bg)",
          color: "var(--btn-primary-text)",
        }}
      >
        Fire up the junkyard
      </button>
    </section>
  );
}
