import pkg from "../../package.json";

// Whole-string match: three numeric parts, optional pre-release suffix.
const VERSION_PATTERN = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

/** Label shown to the user ("v0.3.0"), or null when the version is missing or malformed. */
export function formatAppVersion(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  if (!VERSION_PATTERN.test(raw)) return null;
  return "v" + raw;
}

/**
 * Label for the version declared in package.json.
 * Server components only: importing this module from a client component
 * would ship package.json to the browser.
 */
export function getAppVersionLabel(): string | null {
  // Widened on purpose: the field may be missing, the JSON type says it never is.
  const version: unknown = (pkg as { version?: unknown }).version;
  return formatAppVersion(version);
}
