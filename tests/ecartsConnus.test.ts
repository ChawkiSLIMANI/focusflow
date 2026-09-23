import { describe, it } from "vitest";

/**
 * Known gaps between the product rules and the code, each tracked by a GitHub
 * issue labelled `ecart-regle`. They are deliberately NOT fixed here: US-002
 * only records them. Titles are copied verbatim from `gh issue view <N>`.
 */
describe("écarts connus, tracés mais non corrigés", () => {
  it.todo("#7 — Champs de saisie sous 16 px (zoom iOS Safari)");
  it.todo("#8 — Minimum de 3 caractères non vérifié côté front");
  it.todo("#9 — Échecs silencieux : sauvegarde localStorage et copie presse-papiers");
  it.todo("#10 — Limite de longueur du titre d'étape incohérente (80 / 100 / 120)");
  it.todo("#11 — ShareView : pas de gestion d'erreur si decodeSharePayload lève une exception");
  // Maximal valid payload (task 500, 20 steps of 120, message 150) with barely
  // compressible content: encodes to ~2870 chars, refused by the 2000 limit.
  it.todo("#13 — Partage valide refusé : l'encodage dépasse la limite de 2000 caractères");
});
