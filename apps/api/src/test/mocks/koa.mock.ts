/**
 * Koa Context Mock
 *
 * Factory functions to create mock Koa context for testing middleware.
 */

import { vi } from 'vitest';

export interface MockContext {
  headers: Record<string, string>;
  cookies: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
  };
  state: Record<string, unknown>;
  status: number;
  body: unknown;
  throw: ReturnType<typeof vi.fn>;
}

export function createMockContext(overrides: Partial<MockContext> = {}): MockContext {
  return {
    headers: {},
    cookies: {
      get: vi.fn().mockReturnValue(null),
      set: vi.fn(),
    },
    state: {},
    status: 200,
    body: null,
    throw: vi.fn((status: number, message: string) => {
      const error = new Error(message);
      (error as Error & { status: number }).status = status;
      throw error;
    }),
    ...overrides,
  };
}

export function createMockNext(): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue(undefined);
}
