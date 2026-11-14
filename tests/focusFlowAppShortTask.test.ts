import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FocusFlowApp from "../app/_components/FocusFlowApp";
import { TASK_TOO_SHORT_MESSAGE } from "../app/_lib/breakdownRequest";
import { messagesCreate, mockModelJson } from "./helpers/anthropicMock";
import { callPost } from "./helpers/routeHarness";

vi.mock("@anthropic-ai/sdk", () => import("./helpers/anthropicMock"));

// Server renders never run effects or events: force the initial value of the
// `error` and `task` useState calls (the 2nd and 1st string/null states).
const seed = vi.hoisted(() => ({
  error: null as string | null,
  task: "",
  stringCalls: 0,
  nullCalls: 0,
}));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  function useState(initial?: unknown) {
    const state = actual.useState(initial);
    // First useState("") is `task`.
    if (initial === "" && seed.stringCalls++ === 0 && seed.task) {
      return [seed.task, state[1]];
    }
    // First useState(null) is `error`.
    if (initial === null && seed.nullCalls++ === 0 && seed.error) {
      return [seed.error, state[1]];
    }
    return state;
  }
  return { ...actual, default: actual, useState };
});

// Class of the orange error banner (the dock has its own "fermer" button).
const BANNER = "bg-[#FFF0EB]";

function render(state: { error?: string; task?: string } = {}): string {
  seed.stringCalls = 0;
  seed.nullCalls = 0;
  seed.error = state.error ?? null;
  seed.task = state.task ?? "";
  try {
    return renderToStaticMarkup(
      createElement(FocusFlowApp, { versionLabel: null, footer: null }),
    );
  } finally {
    seed.error = null;
    seed.task = "";
  }
}

beforeEach(() => {
  messagesCreate.mockReset();
  vi.spyOn(console, "log").mockImplementation(() => {});
  mockModelJson({ steps: [{ t: "Ouvrir le doc", m: "2 min" }] });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("US-70 — tâche trop courte, côté front", () => {
  it("2 — le serveur renvoie exactement le même texte que le front", async () => {
    const result = await callPost({ task: "ab" });
    expect(result.status).toBe(400);
    expect(result.body).toEqual({ error: TASK_TOO_SHORT_MESSAGE });
  });

  it("2 — le bandeau affiche le message avec le bouton ✕ « fermer »", () => {
    const html = render({ error: TASK_TOO_SHORT_MESSAGE, task: "ab" });
    expect(html).toContain(`>${TASK_TOO_SHORT_MESSAGE}</p>`);
    expect(html).toContain(BANNER);
    expect(html).toMatch(/bg-\[#FFF0EB\][\s\S]*aria-label="fermer">✕<\/button>/);
    expect(html).toContain("✕");
  });

  it("4 — rendu initial : bouton d'envoi désactivé et aucun bandeau", () => {
    const html = render();
    expect(html).toContain("<textarea");
    expect(html).toMatch(/<button[^>]* disabled=""[^>]*>/);
    expect(html).not.toContain(BANNER);
    expect(html).not.toContain(TASK_TOO_SHORT_MESSAGE);
  });

  it("4 — avec 2 caractères saisis, le bouton reste actif (le message vient au clic)", () => {
    const html = render({ task: "ab" });
    const ctaDisabled = [...html.matchAll(/<button[^>]*>/g)].some(
      (m) => / disabled=""/.test(m[0]),
    );
    expect(ctaDisabled).toBe(false);
  });

  it("5 — la route refuse « ab » et «  a  » sans appeler le SDK", async () => {
    for (const task of ["ab", "  a  "]) {
      const result = await callPost({ task });
      expect(result.status).toBe(400);
      expect(result.body).toEqual({ error: "Décris ta tâche en quelques mots." });
    }
    expect(messagesCreate).not.toHaveBeenCalled();
  });
});
