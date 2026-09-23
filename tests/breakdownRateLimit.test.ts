import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { messagesCreate, mockModelJson } from "./helpers/anthropicMock";
import { callPost } from "./helpers/routeHarness";

vi.mock("@anthropic-ai/sdk", () => import("./helpers/anthropicMock"));

// Dedicated file: the rate limiter is a module-scoped Map, so saturating an IP
// here cannot affect any other test file (each file gets its own module graph).
const SATURATED_IP = "198.51.100.1";
const OTHER_IP = "198.51.100.2";
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

describe("POST /api/breakdown — limiteur de débit", () => {
  it("refuse la 11e requête d'une même IP et laisse passer une autre IP", async () => {
    for (let i = 0; i < 10; i++) {
      const result = await callPost({ task: TASK }, SATURATED_IP);
      expect(result.status).toBe(200);
    }

    const blocked = await callPost({ task: TASK }, SATURATED_IP);
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ error: "Trop de requêtes, réessaie dans une heure." });

    const other = await callPost({ task: TASK }, OTHER_IP);
    expect(other.status).toBe(200);
  });
});
