import { vi } from "vitest";

/**
 * Test double for `Anthropic.APIError`: the route checks
 * `error instanceof Anthropic.APIError` and reads `message` / `status`.
 */
export class MockAPIError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "MockAPIError";
    this.status = status;
  }
}

/** Spy standing in for `client.messages.create`. Never hits the network. */
export const messagesCreate = vi.fn();

/** Shape the route expects back from the model. */
export function mockModelText(text: string): void {
  messagesCreate.mockResolvedValue({ content: [{ type: "text", text }] });
}

/** Same as `mockModelText`, serialising a value as bare JSON. */
export function mockModelJson(value: unknown): void {
  mockModelText(JSON.stringify(value));
}

/** Model answer carrying no `text` block at all. */
export function mockModelWithoutTextBlock(): void {
  messagesCreate.mockResolvedValue({
    content: [{ type: "tool_use", id: "toolu_1", name: "noop", input: {} }],
  });
}

/** Default export: constructed at module load by `app/api/breakdown/route.ts`. */
export default class MockAnthropic {
  static APIError = MockAPIError;

  messages = { create: messagesCreate };
}
