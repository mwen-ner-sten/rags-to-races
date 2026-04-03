"use client";

import { HELP_OVERVIEW_STEPS, HELP_GLOSSARY, HELP_FAQ, HELP_TUTORIAL_WALKTHROUGH } from "@/data/helpContent";

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="rounded-lg border p-4 sm:p-5"
      style={{ borderColor: "var(--divider)", background: "var(--panel-bg)" }}
    >
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--text-heading)" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function HelpBasicsTab() {
  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Getting Started */}
      <SectionCard title="Getting Started">
        <ol className="list-decimal space-y-2 pl-5 text-sm" style={{ color: "var(--text-primary)" }}>
          {HELP_OVERVIEW_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </SectionCard>

      {/* Tutorial Walkthrough */}
      <SectionCard title="Tutorial Walkthrough">
        <p className="mb-3 text-xs" style={{ color: "var(--text-muted)" }}>
          Step-by-step reference for the guided tutorial. Follow the highlighted hints in-game.
        </p>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm" style={{ color: "var(--text-primary)" }}>
          {HELP_TUTORIAL_WALKTHROUGH.map((item) => (
            <li key={item.step}>
              <span className="font-semibold" style={{ color: "var(--text-white)" }}>{item.step}</span>
              <span style={{ color: "var(--text-muted)" }}> &mdash; </span>
              <span style={{ color: "var(--text-secondary)" }}>{item.description}</span>
            </li>
          ))}
        </ol>
      </SectionCard>

      {/* Glossary */}
      <SectionCard title="Game Terms">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {HELP_GLOSSARY.map((item) => (
            <div key={item.term} className="rounded border p-3" style={{ borderColor: "var(--panel-border)" }}>
              <div className="text-sm font-semibold" style={{ color: "var(--text-white)" }}>{item.term}</div>
              <div className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>{item.meaning}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* FAQ */}
      <SectionCard title="Common Questions">
        <div className="space-y-2">
          {HELP_FAQ.map((faq) => (
            <details key={faq.question} className="rounded border" style={{ borderColor: "var(--panel-border)" }}>
              <summary
                className="cursor-pointer px-3 py-2 text-sm font-semibold"
                style={{ color: "var(--text-white)" }}
              >
                {faq.question}
              </summary>
              <div className="border-t px-3 py-2 text-xs" style={{ borderColor: "var(--panel-border)", color: "var(--text-secondary)" }}>
                {faq.answer}
              </div>
            </details>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
