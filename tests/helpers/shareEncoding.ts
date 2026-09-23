/**
 * Encodes an arbitrary value with the same pipeline as `encodeSharePayload`
 * (JSON -> deflate-raw -> base64url), without going through the typed API.
 * Lets the tests feed `decodeSharePayload` with off-contract payloads.
 */
export async function encodeRaw(value: unknown): Promise<string> {
  return encodeRawText(JSON.stringify(value));
}

/** Same pipeline, but for text that is not necessarily JSON. */
export async function encodeRawText(text: string): Promise<string> {
  const input = new TextEncoder().encode(text);
  const stream = new Blob([input]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
  let binary = "";
  for (const byte of compressed) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
