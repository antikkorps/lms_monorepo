/**
 * Koa Context Mock
 *
 * Factory functions to create mock Koa context for testing middleware.
 */

import { vi } from 'vitest';
import type { Next } from 'koa';

export interface MockContextState {
  user?: {
    userId: string;
    email?: string;
    role?: string;
    tenantId?: string | null;
    fullUser?: unknown;
  };
  tenant?: unknown;
}

export interface MockContext {
  headers: Record<string, string>;
  cookies: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
  };
  state: MockContextState;
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

export function createMockNext(): Next {
  return vi.fn().mockResolvedValue(undefined) as unknown as Next;
}
