import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MockAPIError,
  messagesCreate,
  mockModelJson,
  mockModelText,
  mockModelWithoutTextBlock,
} from "./helpers/anthropicMock";
import { callPost } from "./helpers/routeHarness";

vi.mock("@anthropic-ai/sdk", () => import("./helpers/anthropicMock"));

const TASK = "Préparer la réunion de lundi";
const STEPS = [
  { t: "Ouvrir le doc", m: "2 min" },
  { t: "Lister les points", m: "5 min" },
];

beforeEach(() => {
  messagesCreate.mockReset();
  // route.ts logs the raw model response (issue #14): keep the report readable.
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/breakdown — retrait des backticks markdown", () => {
  it("accepte une réponse encadrée par ```json", async () => {
    mockModelText(`\`\`\`json\n${JSON.stringify({ steps: STEPS })}\n\`\`\``);
    const result = await callPost({ task: TASK });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ steps: STEPS });
  });

  it("accepte une réponse encadrée par ``` sans le mot json", async () => {
    mockModelText(`\`\`\`\n${JSON.stringify({ steps: STEPS })}\n\`\`\``);
    const result = await callPost({ task: TASK });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ steps: STEPS });
  });

  it("accepte une réponse JSON nue", async () => {
    mockModelJson({ steps: STEPS });
    const result = await callPost({ task: TASK });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ steps: STEPS });
  });
});

describe("POST /api/breakdown — réponse du modèle inexploitable", () => {
  it("renvoie 500 quand la réponse n'est pas analysable", async () => {
    mockModelText("Bonjour, voici tes étapes :");
    const result = await callPost({ task: TASK });
    expect(result.status).toBe(500);
    expect(result.body).toEqual({ error: "Réponse du modèle invalide." });
  });

  it("renvoie 500 quand la réponse ne comporte aucun bloc de texte", async () => {
    mockModelWithoutTextBlock();
    const result = await callPost({ task: TASK });
    expect(result.status).toBe(500);
    expect(result.body).toEqual({ error: "Pas de réponse du modèle." });
  });
});

describe("POST /api/breakdown — longueur du titre d'étape", () => {
  it("refuse un titre de 101 caractères", async () => {
    mockModelJson({ steps: [{ t: "a".repeat(101), m: "2 min" }] });
    const result = await callPost({ task: TASK });
    expect(result.status).toBe(500);
    expect(result.body).toEqual({ error: "Réponse du modèle invalide." });
  });

  it("accepte un titre de 100 caractères et le renvoie intact", async () => {
    const title = "a".repeat(100);
    mockModelJson({ steps: [{ t: title, m: "2 min" }] });
    const result = await callPost({ task: TASK });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ steps: [{ t: title, m: "2 min" }] });
  });
});

describe("POST /api/breakdown — refus renvoyé par le modèle", () => {
  it("reprend le message de refus avec le statut 400", async () => {
    mockModelJson({ error: "Cette tâche ne peut pas être découpée par FocusFlow." });
    const result = await callPost({ task: TASK });
    expect(result.status).toBe(400);
    expect(result.body).toEqual({
      error: "Cette tâche ne peut pas être découpée par FocusFlow.",
    });
  });
});

describe("POST /api/breakdown — format d'étapes inattendu", () => {
  it("renvoie 500 quand steps est vide", async () => {
    mockModelJson({ steps: [] });
    const result = await callPost({ task: TASK });
    expect(result.status).toBe(500);
    expect(result.body).toEqual({ error: "Format de réponse inattendu." });
  });

  it("renvoie 500 quand aucune étape n'est exploitable", async () => {
    mockModelJson({ steps: [{ t: 42, m: "2 min" }] });
    const result = await callPost({ task: TASK });
    expect(result.status).toBe(500);
    expect(result.body).toEqual({ error: "Format de réponse inattendu." });
  });

  it("ne conserve que les étapes dont le titre fait au moins 3 caractères", async () => {
    mockModelJson({
      steps: [
        { t: "Ouvrir le doc", m: "2 min" },
        { t: "a", m: "1 min" },
      ],
    });
    const result = await callPost({ task: TASK });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ steps: [{ t: "Ouvrir le doc", m: "2 min" }] });
  });

  it("renvoie 500 quand toutes les étapes ont un titre trop court", async () => {
    mockModelJson({
      steps: [
        { t: "ok", m: "2 min" },
        { t: "a", m: "1 min" },
      ],
    });
    const result = await callPost({ task: TASK });
    expect(result.status).toBe(500);
    expect(result.body).toEqual({ error: "Format de réponse inattendu." });
  });
});

describe("POST /api/breakdown — erreurs remontées par le SDK", () => {
  it("propage le statut et le message d'une APIError", async () => {
    messagesCreate.mockRejectedValue(new MockAPIError(529, "Overloaded"));
    const result = await callPost({ task: TASK });
    expect(result.status).toBe(529);
    expect(result.body).toEqual({ error: "Overloaded" });
  });

  it("renvoie 500 et un message générique sur toute autre erreur", async () => {
    messagesCreate.mockRejectedValue(new Error("boom"));
    const result = await callPost({ task: TASK });
    expect(result.status).toBe(500);
    expect(result.body).toEqual({ error: "Erreur interne." });
  });
});
