export const TASK_MIN_LENGTH = 3;
export const TASK_TOO_SHORT_MESSAGE = "Décris ta tâche en quelques mots.";

export type MicroStepResult = { t: string; m: string; soft?: boolean };

export type BreakdownResult =
  | { kind: "ignored" }
  | { kind: "error"; message: string }
  | { kind: "steps"; steps: MicroStepResult[] };

/** True for a non-empty input that is still under the minimum once trimmed. */
export function isTaskTooShort(task: string): boolean {
  const length = task.trim().length;
  return length > 0 && length < TASK_MIN_LENGTH;
}

/**
 * Sends the task to the breakdown route and maps the outcome to a result.
 * An empty input is ignored without any network call.
 */
export async function requestBreakdown(
  task: string,
  mood: string,
  fetchImpl: typeof fetch = fetch,
): Promise<BreakdownResult> {
  if (!task.trim()) return { kind: "ignored" };
  if (isTaskTooShort(task)) {
    return { kind: "error", message: TASK_TOO_SHORT_MESSAGE };
  }
  try {
    const res = await fetchImpl("/api/breakdown", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task, mood }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      return { kind: "error", message: data.error ?? "Une erreur est survenue." };
    }
    return { kind: "steps", steps: data.steps };
  } catch {
    return { kind: "error", message: "Impossible de contacter le serveur. Vérifie ta connexion." };
  }
}
