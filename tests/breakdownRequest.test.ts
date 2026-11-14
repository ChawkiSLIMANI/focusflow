import { describe, expect, it, vi } from "vitest";
import {
  TASK_TOO_SHORT_MESSAGE,
  requestBreakdown,
} from "../app/_lib/breakdownRequest";

const STEPS = [{ t: "Ouvrir le doc", m: "2 min" }];

function reply(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status }));
}

describe("requestBreakdown — caractérisation du traitement existant (scénario 7)", () => {
  it("7 — renvoie l'erreur du serveur pour 400 { error }", async () => {
    expect(await requestBreakdown("Ranger mon bureau", "mid", reply(400, { error: "X" }))).toEqual({
      kind: "error",
      message: "X",
    });
  });

  it("7 — renvoie l'erreur même pour un 200 { error }", async () => {
    expect(await requestBreakdown("Ranger mon bureau", "mid", reply(200, { error: "Y" }))).toEqual({
      kind: "error",
      message: "Y",
    });
  });

  it("7 — message par défaut pour un 500 sans champ error", async () => {
    expect(await requestBreakdown("Ranger mon bureau", "mid", reply(500, {}))).toEqual({
      kind: "error",
      message: "Une erreur est survenue.",
    });
  });

  it("7 — message de connexion quand le fetch lève", async () => {
    const failing = vi.fn(async () => {
      throw new Error("réseau");
    });
    expect(await requestBreakdown("Ranger mon bureau", "mid", failing)).toEqual({
      kind: "error",
      message: "Impossible de contacter le serveur. Vérifie ta connexion.",
    });
  });

  it("7 — message de connexion quand le JSON est illisible", async () => {
    const bad = vi.fn(async () => new Response("pas du json", { status: 200 }));
    expect(await requestBreakdown("Ranger mon bureau", "mid", bad)).toEqual({
      kind: "error",
      message: "Impossible de contacter le serveur. Vérifie ta connexion.",
    });
  });

  it("7 — succès : renvoie les étapes", async () => {
    expect(await requestBreakdown("Ranger mon bureau", "low", reply(200, { steps: STEPS }))).toEqual({
      kind: "steps",
      steps: STEPS,
    });
  });
});

describe("requestBreakdown — saisie vide (scénario 4)", () => {
  it.each(["", "    "])("4 — %j est ignorée sans appel", async (input) => {
    const spy = reply(200, { steps: STEPS });
    expect(await requestBreakdown(input, "mid", spy)).toEqual({ kind: "ignored" });
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("requestBreakdown — garde de longueur (scénarios 1 et 3)", () => {
  it.each(["ab", "  a  ", "a", "\tab\n"])("1 — %j : aucun appel réseau", async (input) => {
    const spy = reply(200, { steps: STEPS });
    expect(await requestBreakdown(input, "mid", spy)).toEqual({
      kind: "error",
      message: "Décris ta tâche en quelques mots.",
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it("1 — le message exporté est le texte attendu", () => {
    expect(TASK_TOO_SHORT_MESSAGE).toBe("Décris ta tâche en quelques mots.");
  });

  it.each(["abc", "  abc  "])("3 — %j : exactement 3 caractères est envoyé tel quel", async (input) => {
    const spy = reply(200, { steps: STEPS });
    expect(await requestBreakdown(input, "high", spy)).toEqual({ kind: "steps", steps: STEPS });
    expect(spy).toHaveBeenCalledTimes(1);
    const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/breakdown");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ task: input, mood: "high" });
  });
});
