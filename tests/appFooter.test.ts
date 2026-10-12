import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppFooter from "../app/_components/AppFooter";
import Home from "../app/page";
import SharePage from "../app/partage/page";

// Mutable stand-in for package.json: each test decides whether a version exists.
const pkg = vi.hoisted(() => ({ version: "9.8.7" } as { version?: string }));
vi.mock("../package.json", () => ({ default: pkg }));

// FocusFlowApp only reaches "loading" and "results" through effects and events,
// which a server render never runs. This seam forces the initial value of one
// useState call during a render; every other call goes through untouched.
const seed = vi.hoisted(() => ({
  loading: false,
  steps: null as Array<{ t: string; m: string }> | null,
  falseCalls: 0,
  emptyArrayCalls: 0,
}));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  function useState(initial?: unknown) {
    const state = actual.useState(initial);
    // First useState(false) of the render is FocusFlowApp's `loading`.
    if (initial === false && seed.falseCalls++ === 0 && seed.loading) {
      return [true, state[1]];
    }
    // First useState([]) of the render is FocusFlowApp's `steps`.
    if (Array.isArray(initial) && initial.length === 0 && seed.emptyArrayCalls++ === 0 && seed.steps) {
      return [seed.steps, state[1]];
    }
    return state;
  }
  return { ...actual, default: actual, useState };
});

/** Renders the home page with FocusFlowApp forced into the given state. */
function renderHome(state: "empty" | "loading" | "results"): string {
  seed.falseCalls = 0;
  seed.emptyArrayCalls = 0;
  seed.loading = state === "loading";
  seed.steps = state === "results" ? [{ t: STEP_TITLE, m: "2 min" }] : null;
  try {
    return renderToStaticMarkup(createElement(Home));
  } finally {
    seed.loading = false;
    seed.steps = null;
  }
}

const STEP_TITLE = "Étape témoin du test";
const FOOTER_HTML =
  '<footer class="py-8 text-center font-mono text-[11px] text-ink-faint">v9.8.7</footer>';
const DOCK = "fixed bottom-0";

/** Number of non-overlapping occurrences of `needle` in `html`. */
function count(html: string, needle: string): number {
  return html.split(needle).length - 1;
}

/** Inner HTML of every <footer> element in `html`. */
function footers(html: string): string[] {
  return [...html.matchAll(/<footer[^>]*>([\s\S]*?)<\/footer>/g)].map((m) => m[1]);
}

beforeEach(() => {
  pkg.version = "9.8.7";
});

describe("AppFooter", () => {
  it("C2 — affiche la version lue dans package.json", () => {
    const html = renderToStaticMarkup(createElement(AppFooter));

    expect(count(html, "<footer")).toBe(1);
    expect(html).toContain("v9.8.7");
    expect(html).not.toContain("0.3.0");
    // Strict: a single <footer>, D7 classes only (never "fixed"), the label alone.
    expect(html).toBe(FOOTER_HTML);
    // renderToString separates adjacent text nodes with <!-- -->: the label is one string.
    expect(renderToString(createElement(AppFooter))).toBe(FOOTER_HTML);
  });

  it("C2 — composant serveur : pas de directive use client", () => {
    const source = readFileSync(
      fileURLToPath(new URL("../app/_components/AppFooter.tsx", import.meta.url)),
      "utf8",
    );

    expect(source).toContain("export default function AppFooter()");
    expect(source).not.toMatch(/["']use client["']/);
  });

  it("C5 — ne rend rien si la version est indisponible", () => {
    delete pkg.version;

    const html = renderToStaticMarkup(createElement(AppFooter));

    expect(html).toBe("");
  });
});

describe("Pied de page dans les pages", () => {
  it("C6 — accueil : pied de page avant le dock", () => {
    const html = renderToStaticMarkup(createElement(Home));

    expect(count(html, "<footer")).toBe(1);
    expect(footers(html)).toHaveLength(1);
    expect(footers(html)[0]).toContain("v9.8.7");
    // Exactly one fixed-bottom element, the dock: the footer itself is in the flow.
    expect(count(html, DOCK)).toBe(1);
    expect(count(html, FOOTER_HTML)).toBe(1);
    expect(html.indexOf("<footer")).toBeLessThan(html.indexOf(DOCK));
  });

  it("C6 — accueil : pied de page présent dans les trois états", () => {
    const empty = renderHome("empty");
    const loading = renderHome("loading");
    const results = renderHome("results");

    // Guards: each render really is in the state it claims.
    expect(empty).toContain("<textarea");
    expect(empty).not.toContain(STEP_TITLE);
    expect(loading).toContain("<textarea");
    expect(loading).not.toBe(empty);
    expect(results).toContain(STEP_TITLE);
    expect(results).not.toContain("<textarea");

    for (const html of [empty, loading, results]) {
      expect(count(html, "<footer")).toBe(1);
      expect(count(html, FOOTER_HTML)).toBe(1);
      expect(count(html, DOCK)).toBe(1);
      expect(html.indexOf("<footer")).toBeLessThan(html.indexOf(DOCK));
    }
  });

  it("C7 — partage : pied de page hors de ShareView", () => {
    const html = renderToStaticMarkup(createElement(SharePage));

    expect(count(html, "<footer")).toBe(1);
    expect(footers(html)).toHaveLength(1);
    expect(footers(html)[0]).toContain("v9.8.7");
  });
});
