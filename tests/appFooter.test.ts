import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppFooter from "../app/_components/AppFooter";

// Mutable stand-in for package.json: each test decides whether a version exists.
const pkg = vi.hoisted(() => ({ version: "9.8.7" } as { version?: string }));
vi.mock("../package.json", () => ({ default: pkg }));

/** Number of non-overlapping occurrences of `needle` in `html`. */
function count(html: string, needle: string): number {
  return html.split(needle).length - 1;
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
  });

  it("C5 — ne rend rien si la version est indisponible", () => {
    delete pkg.version;

    const html = renderToStaticMarkup(createElement(AppFooter));

    expect(html).toBe("");
  });
});
