import { describe, expect, it, vi } from "vitest";
import {
  decodeSharePayload,
  encodeSharePayload,
  type SharePayload,
} from "../app/_lib/sharePayload";
import { encodeRaw, encodeRawText } from "./helpers/shareEncoding";

const NOMINAL: SharePayload = {
  v: 1,
  task: "Préparer la réunion de lundi",
  steps: [
    { t: "Ouvrir le doc", m: "2 min" },
    { t: "Respirer 30 s", m: "1 min", soft: true },
  ],
  message: "Courage, tu gères.",
};

/** Base payload with a single field overridden, encoded off-contract. */
function withField(field: string, value: unknown): Record<string, unknown> {
  return { ...NOMINAL, [field]: value };
}

describe("sharePayload — aller-retour", () => {
  it(
    "encode puis décode une charge nominale à l'identique (garde anti-blocage CompressionStream)",
    { timeout: 2000 },
    async () => {
      const encoded = await encodeSharePayload(NOMINAL);
      const decoded = await decodeSharePayload(encoded);
      expect(decoded).toEqual(NOMINAL);
    },
  );

  it("produit une chaîne composée uniquement de caractères base64url", async () => {
    const encoded = await encodeSharePayload(NOMINAL);
    expect(encoded.length).toBeGreaterThan(0);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("retire la propriété soft quand elle vaut false", async () => {
    const payload: SharePayload = {
      ...NOMINAL,
      steps: [{ t: "Ouvrir le doc", m: "2 min", soft: false }],
    };
    const decoded = await decodeSharePayload(await encodeSharePayload(payload));
    expect(decoded).not.toBeNull();
    expect(decoded?.steps[0]).toEqual({ t: "Ouvrir le doc", m: "2 min" });
    expect(Object.prototype.hasOwnProperty.call(decoded?.steps[0] ?? {}, "soft")).toBe(false);
  });
});

describe("decodeSharePayload — entrées limites et corrompues", () => {
  it("renvoie null sur une chaîne vide", async () => {
    await expect(decodeSharePayload("")).resolves.toBeNull();
  });

  it("renvoie null au-delà de 2000 caractères sans tenter de décompresser", async () => {
    // The guard sits before the try block, so an over-long input must be rejected
    // without ever reaching DecompressionStream. Spying on the constructor pins that
    // intent: asserting null alone would also pass if the guard disappeared, because
    // a filler string fails decompression anyway.
    // While the spy is installed it replaces the real constructor, so decoding cannot
    // succeed — only whether the constructor is reached is observed here.
    // Length must stay a multiple of 4: fromUrlBase64 calls atob without restoring
    // padding, so 2001 characters would throw there and never reach the constructor,
    // which would make this test pass for the wrong reason again.
    const spy = vi.spyOn(globalThis, "DecompressionStream");
    try {
      const tooLong = "a".repeat(2004);
      expect(tooLong.length % 4).toBe(0);
      await expect(decodeSharePayload(tooLong)).resolves.toBeNull();
      expect(spy).not.toHaveBeenCalled();

      // Control: at the cap the guard lets the input through, which proves the spy
      // is live and would have registered a call above.
      const atLimit = "a".repeat(2000);
      expect(atLimit.length).toBe(2000);
      await expect(decodeSharePayload(atLimit)).resolves.toBeNull();
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
    }
  });

  it("renvoie null sur une chaîne qui n'est pas du base64", async () => {
    await expect(decodeSharePayload("!!!pas-du-base64!!!")).resolves.toBeNull();
  });

  it("renvoie null sur du base64url valide qui ne se décompresse pas", async () => {
    await expect(decodeSharePayload("QUJDREVGRw")).resolves.toBeNull();
  });

  it("renvoie null sur une charge compressée qui n'est pas du JSON", async () => {
    const encoded = await encodeRawText("ceci n'est pas du JSON");
    await expect(decodeSharePayload(encoded)).resolves.toBeNull();
  });
});

describe("decodeSharePayload — validation de la charge décodée", () => {
  const illegal = "Acheter de la drogue";

  const cases: Array<[string, Record<string, unknown>]> = [
    ["v vaut 2", withField("v", 2)],
    ["task est vide", withField("task", "")],
    ["task fait 501 caractères", withField("task", "a".repeat(501))],
    ["steps est un tableau vide", withField("steps", [])],
    [
      "steps contient 21 éléments",
      withField(
        "steps",
        Array.from({ length: 21 }, () => ({ t: "Ouvrir le doc", m: "2 min" })),
      ),
    ],
    ["un titre d'étape fait 121 caractères", withField("steps", [{ t: "a".repeat(121), m: "2 min" }])],
    ["une durée d'étape fait 21 caractères", withField("steps", [{ t: "Ouvrir le doc", m: "a".repeat(21) }])],
    ["soft vaut la chaîne \"true\"", withField("steps", [{ t: "Ouvrir le doc", m: "2 min", soft: "true" }])],
    ["message fait 151 caractères", withField("message", "a".repeat(151))],
    ["message déclenche le filtre de contenu", withField("message", "Ferme ta gueule")],
    ["task contient un contenu illégal", withField("task", illegal)],
    ["un titre d'étape contient un contenu illégal", withField("steps", [{ t: illegal, m: "2 min" }])],
  ];

  for (const [label, payload] of cases) {
    it(`renvoie null quand ${label}`, async () => {
      const encoded = await encodeRaw(payload);
      await expect(decodeSharePayload(encoded)).resolves.toBeNull();
    });
  }

  it("accepte les valeurs aux bornes hautes", async () => {
    const payload: SharePayload = {
      v: 1,
      task: "a".repeat(500),
      steps: Array.from({ length: 20 }, () => ({ t: "b".repeat(120), m: "c".repeat(20) })),
      message: "d".repeat(150),
    };
    const encoded = await encodeSharePayload(payload);
    const decoded = await decodeSharePayload(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded?.v).toBe(1);
    expect(decoded?.task).toHaveLength(500);
    expect(decoded?.steps).toHaveLength(20);
    expect(decoded?.steps[0].t).toHaveLength(120);
    expect(decoded?.steps[0].m).toHaveLength(20);
    expect(decoded?.message).toHaveLength(150);
  });
});
