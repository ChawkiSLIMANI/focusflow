import type { NextRequest } from "next/server";
import { POST } from "../../app/api/breakdown/route";
import { messagesCreate } from "./anthropicMock";

export type PostResult = { status: number; body: Record<string, unknown> };

export type CreateArgs = {
  model: string;
  max_tokens: number;
  system: Array<{ type: string; text: string; cache_control?: { type: string } }>;
  messages: Array<{ role: string; content: string }>;
};

let ipCounter = 0;

/**
 * The route keeps a module-scoped rate limiter (10 requests / hour / IP) that is
 * incremented before any validation: every call needs its own IP so that tests
 * never depend on execution order.
 */
export function uniqueIp(): string {
  ipCounter += 1;
  return `test-ip-${ipCounter}`;
}

/** Builds a plain Request; `body` is sent verbatim when it is a string. */
export function makeRequest(body: unknown, ip: string = uniqueIp()): NextRequest {
  const request = new Request("http://localhost/api/breakdown", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return request as unknown as NextRequest;
}

/** Calls the route handler and reads back status + parsed JSON body. */
export async function callPost(body: unknown, ip: string = uniqueIp()): Promise<PostResult> {
  const response = await POST(makeRequest(body, ip));
  const parsed = (await response.json()) as Record<string, unknown>;
  return { status: response.status, body: parsed };
}

/** Arguments captured by the SDK double for a given call (default: the first). */
export function createCallArgs(index = 0): CreateArgs {
  return messagesCreate.mock.calls[index][0] as CreateArgs;
}

/** User message sent to the model for a given call (default: the first). */
export function userMessage(index = 0): string {
  return createCallArgs(index).messages[0].content;
}

/** Part of the user message that follows the "Tâche : " marker. */
export function taskInPrompt(index = 0): string {
  const marker = "\n\nTâche : ";
  const message = userMessage(index);
  return message.slice(message.indexOf(marker) + marker.length);
}

/** Mood instructions part of the user message, i.e. everything before the task. */
export function moodInPrompt(index = 0): string {
  const marker = "\n\nTâche : ";
  const message = userMessage(index);
  return message.slice(0, message.indexOf(marker));
}
