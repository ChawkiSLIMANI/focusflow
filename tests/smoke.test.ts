import { describe, expect, it, vi } from "vitest";
import Anthropic from "@anthropic-ai/sdk";
import { messagesCreate } from "./helpers/anthropicMock";

vi.mock("@anthropic-ai/sdk", () => import("./helpers/anthropicMock"));

describe("outillage de test", () => {
  it("importe la route sous Vitest sans erreur d'environnement", async () => {
    const route = await import("../app/api/breakdown/route");
    expect(typeof route.POST).toBe("function");
  });

  it("importe les utilitaires de partage et de filtrage", async () => {
    const share = await import("../app/_lib/sharePayload");
    const filter = await import("../app/_lib/contentFilter");
    expect(typeof share.encodeSharePayload).toBe("function");
    expect(typeof share.decodeSharePayload).toBe("function");
    expect(typeof filter.validateMessage).toBe("function");
    expect(typeof filter.containsIllegalContent).toBe("function");
  });

  it("remplace le SDK Anthropic par un double : aucun appel réseau possible", async () => {
    await import("../app/api/breakdown/route");
    const client = new Anthropic();
    expect(client.messages.create).toBe(messagesCreate);
    expect(vi.isMockFunction(messagesCreate)).toBe(true);
  });
});
