import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { messagesCreate, mockModelJson } from "./helpers/anthropicMock";
import { callPost, createCallArgs, moodInPrompt, userMessage } from "./helpers/routeHarness";

vi.mock("@anthropic-ai/sdk", () => import("./helpers/anthropicMock"));

const TASK = "Préparer la réunion de lundi";

beforeEach(() => {
  messagesCreate.mockReset();
  // route.ts logs the raw model response (issue #14): keep the report readable.
  vi.spyOn(console, "log").mockImplementation(() => {});
  mockModelJson({ steps: [{ t: "Ouvrir le doc", m: "2 min" }] });
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Mood instructions actually sent to the model for a given mood. */
async function promptFor(mood?: string): Promise<string> {
  messagesCreate.mockClear();
  const body = mood === undefined ? { task: TASK } : { task: TASK, mood };
  const result = await callPost(body);
  expect(result.status).toBe(200);
  return moodInPrompt();
}

describe("POST /api/breakdown — instruction d'humeur", () => {
  // Short, stable markers only: rewording the prompt must not break the suite.
  const markers: Array<[string, string]> = [
    ["low", "5 à 6"],
    ["mid", "4 à 5"],
    ["high", "4 à 5"],
    ["panic", "3 à 4"],
  ];

  for (const [mood, marker] of markers) {
    it(`transmet le marqueur « ${marker} » pour l'humeur ${mood}`, async () => {
      expect(await promptFor(mood)).toContain(marker);
    });
  }

  it("mentionne la respiration pour l'humeur panic", async () => {
    expect(await promptFor("panic")).toContain("respiration");
  });

  it("utilise quatre instructions deux à deux distinctes", async () => {
    const prompts = [
      await promptFor("low"),
      await promptFor("mid"),
      await promptFor("high"),
      await promptFor("panic"),
    ];
    expect(new Set(prompts).size).toBe(4);
  });

  it("termine le message par la tâche nettoyée", async () => {
    await promptFor("mid");
    expect(userMessage().endsWith(`\n\nTâche : ${TASK}`)).toBe(true);
  });
});

describe("POST /api/breakdown — humeur absente ou inconnue", () => {
  it("retombe sur l'humeur mid quand le champ mood est absent", async () => {
    const mid = await promptFor("mid");
    expect(await promptFor()).toBe(mid);
  });

  it("retombe sur l'humeur mid quand le champ mood est inconnu", async () => {
    const mid = await promptFor("mid");
    expect(await promptFor("zen")).toBe(mid);
  });
});

describe("POST /api/breakdown — paramètres d'appel du modèle", () => {
  it("appelle le modèle une seule fois avec les paramètres attendus", async () => {
    const result = await callPost({ task: TASK });
    expect(result.status).toBe(200);
    expect(messagesCreate).toHaveBeenCalledTimes(1);

    const args = createCallArgs();
    expect(args.model).toBe("claude-sonnet-4-6");
    expect(args.max_tokens).toBe(1024);
    expect(Array.isArray(args.system)).toBe(true);
    expect(args.system[0].cache_control).toEqual({ type: "ephemeral" });
  });
});
