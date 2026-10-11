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
