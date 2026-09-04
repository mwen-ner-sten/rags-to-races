import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

async function renderMissing(nodeEnv: string): Promise<string> {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", nodeEnv);
  const { default: GameAssetImage } = await import("@/components/GameAssetImage");
  return renderToStaticMarkup(createElement(GameAssetImage, { kind: "part", id: "not_a_real_part", width: 48 }));
}

describe("GameAssetImage missing-asset placeholder", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", ORIGINAL_NODE_ENV ?? "test");
  });

  it("renders a visible dashed placeholder carrying the id outside production", async () => {
    const html = await renderMissing("development");
    expect(html).toContain('data-missing-asset="part:not_a_real_part"');
    expect(html).toContain("not_a_real_part");
    expect(html).toContain("dashed");
  });

  it("renders nothing in production", async () => {
    const html = await renderMissing("production");
    expect(html).toBe("");
  });

  it("still renders the manifest image for known assets", async () => {
    vi.resetModules();
    const { default: GameAssetImage } = await import("@/components/GameAssetImage");
    const html = renderToStaticMarkup(createElement(GameAssetImage, { kind: "vehicle", id: "push_mower" }));
    expect(html).toContain("/sprites/vehicles/push_mower.webp");
    expect(html).not.toContain("data-missing-asset");
  });
});
