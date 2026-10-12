import { describe, expect, it } from "vitest";
import { formatAppVersion } from "../app/_lib/appVersion";

describe("formatAppVersion", () => {
  it("C1 — préfixe v suivi de la version", () => {
    expect(formatAppVersion("0.3.0")).toBe("v0.3.0");
    expect(formatAppVersion("10.20.30")).toBe("v10.20.30");
    expect(formatAppVersion("0.0.0")).toBe("v0.0.0");
  });

  it("C3 — accepte une préversion", () => {
    expect(formatAppVersion("1.2.3-beta.1")).toBe("v1.2.3-beta.1");
  });

  it("C4 — renvoie null pour une version absente ou invalide", () => {
    const invalid: unknown[] = [
      undefined,
      null,
      42,
      "",
      "   ",
      "abc",
      "0.1",
      "v0.1.0",
      "1.2.3 ",
      "1.2.3<b>",
    ];

    expect(invalid).toHaveLength(10);
    for (const raw of invalid) {
      expect(formatAppVersion(raw), `valeur : ${JSON.stringify(raw)}`).toBeNull();
    }
  });
});
