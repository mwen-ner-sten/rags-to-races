import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import ContextualCoachCard from "../ContextualCoachCard";

const coach = {
  id: "toolkit" as const,
  heading: "Next step: compare your parts",
  body: "Compare a loose part with the one installed on your vehicle.",
  actionName: "Compare installed parts",
  targetTab: "garage" as const,
};

describe("ContextualCoachCard", () => {
  it("renders optional coaching as a polite, named status with independent actions", () => {
    const html = renderToStaticMarkup(
      <ContextualCoachCard coach={coach} onNavigate={vi.fn()} onDismiss={vi.fn()} />,
    );

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-labelledby="contextual-coach-toolkit-heading"');
    expect(html).toContain('id="contextual-coach-toolkit-heading"');
    expect(html).toContain(">Compare installed parts</button>");
    expect(html).toContain('aria-label="Dismiss compare your parts coaching"');
    expect(html).not.toContain('role="dialog"');
  });

  it("uses responsive fixed-nav clearance without intercepting the page", () => {
    const html = renderToStaticMarkup(
      <ContextualCoachCard coach={coach} onNavigate={vi.fn()} onDismiss={vi.fn()} />,
    );

    expect(html).toContain("pointer-events-none");
    expect(html).toContain("bottom-[calc(5rem+env(safe-area-inset-bottom))]");
    expect(html).toContain("sm:bottom-6");
    expect(html).toContain("pointer-events-auto");
  });
});
