import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Brand from "../app/_components/Brand";
import Home from "../app/page";

/** Number of non-overlapping occurrences of `needle` in `html`. */
function count(html: string, needle: string): number {
  return html.split(needle).length - 1;
}

const LOGO = 'Focus<span class="italic">Flow</span>';
const DOT = "animate-breathe";
// This class is used nowhere else in app/: it identifies the version pill.
const PILL = "text-[9.5px]";
const DOCK = "fixed bottom-0";

// Characterization (US-1, T0): written before any change to Brand, never edited afterwards.
describe("Brand — caractérisation", () => {
  it("C0 — logo et point inchangés", () => {
    const html = renderToStaticMarkup(createElement(Brand));

    expect(count(html, LOGO)).toBe(1);
    expect(count(html, DOT)).toBe(1);
  });

  it("C0 — accueil : logo et pastille avant le dock", () => {
    const html = renderToStaticMarkup(createElement(Home));

    expect(count(html, DOT)).toBe(1);
    expect(count(html, PILL)).toBe(1);
    expect(html.indexOf(DOCK)).toBeGreaterThan(-1);
    expect(html.indexOf(DOT)).toBeLessThan(html.indexOf(DOCK));
    expect(html.indexOf(PILL)).toBeLessThan(html.indexOf(DOCK));
  });
});

// --- Version pill (US-1, T4). Added below the characterization block, which stays untouched. ---
import { beforeEach, vi } from "vitest";

// Mutable stand-in for package.json: each test decides whether a version exists.
const pkg = vi.hoisted(() => ({ version: "9.8.7" } as { version?: string }));
vi.mock("../package.json", () => ({ default: pkg }));

const PILL_CLASS =
  "font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-soft border border-rule rounded-full px-[7px] py-[3px] leading-none";

/** Every <span> whose class attribute contains the pill marker, as [class, text] pairs. */
function pills(html: string): Array<{ className: string; text: string }> {
  const found: Array<{ className: string; text: string }> = [];
  const re = /<span class="([^"]*)">([^<]*)<\/span>/g;
  for (const match of html.matchAll(re)) {
    if (match[1].includes(PILL)) found.push({ className: match[1], text: match[2] });
  }
  return found;
}

beforeEach(() => {
  pkg.version = "9.8.7";
});

describe("Brand — pastille de version", () => {
  it("C13 — pastille : version lue dans package.json", () => {
    const html = renderToStaticMarkup(createElement(Home));

    expect(count(html, PILL)).toBe(1);
    const found = pills(html);
    expect(found).toHaveLength(1);
    expect(found[0].text).toBe("v9.8.7");
    expect(found[0].className).toBe(PILL_CLASS);
    expect(html).not.toContain("v0.3 · build");
    expect(html).not.toContain("0.3.0");
  });

  it("C14 — pastille absente si la version est indisponible", () => {
    delete pkg.version;

    const html = renderToStaticMarkup(createElement(Home));

    expect(count(html, PILL)).toBe(0);
    expect(count(html, "<footer")).toBe(0);
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("vnull");
    expect(html).not.toContain("v0.3");
    expect(count(html, LOGO)).toBe(1);
  });
});
